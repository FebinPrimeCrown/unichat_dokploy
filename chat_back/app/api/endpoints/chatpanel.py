import json
import os
import uuid
from datetime import datetime,timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
import requests
from app.models.widget import WidgetCreate, WidgetOut
from app.database.models import ChatMessage, Widget,User as DBUser,ChatSession,WidgetIndex
from app.services.user import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from dateutil.parser import isoparse
from app.mqtt.publisher import publish_mqtt
from jose import jwt
from app.database.base import SessionLocal  # or wherever your SessionLocal is defined
import logging
import json, httpx, threading, time

from app.database.base import get_db

from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    Body,
    WebSocketDisconnect,
    Form,
    HTTPException,
    UploadFile,
    File,
    Request
)


router = APIRouter()
logger = logging.getLogger(__name__)

class Message(BaseModel):
    senderId: str
    msg: str
    type: str
    createdAt: str

@router.get("/api/list")
def list_chats(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    sessions = (
        db.query(ChatSession)
        .join(ChatSession.widget)
        .filter(Widget.organisation_id == current_user.organisation_id)
        .order_by(ChatSession.last_active.desc())
        .all()
    )
    return [
        {
            "id": session.id,
            "name": session.guest_id,
            "room_id": session.room_id,
            "last_message": session.last_message,
            "last_active": session.last_active.replace(tzinfo=timezone.utc).isoformat(),
            "widget_token": session.widget.token,
            "status": "offline",
            "thumb": f"https://api.dicebear.com/7.x/thumbs/svg?seed={session.guest_id}",
            "messages": []
        }
        for session in sessions
    ]


from datetime import datetime, timedelta

# 🧠 In-memory handler tracking
def get_session_handler(widget) -> str:
    """
    Decide who handles the session based on flow_json.
    Returns "ai" or "admin".
    """
    try:
        flow = widget.flow_json
        if isinstance(flow, str):
            flow = json.loads(flow)  # only load if it's a string
        elif not isinstance(flow, dict):
            print("❌ flow_json is not dict or str, defaulting to admin")
            return "admin"

        nodes = {n["id"]: n for n in flow.get("nodes", [])}
        edges = flow.get("edges", [])

        print("📝 Nodes in flow:", nodes)
        print("📝 Edges in flow:", edges)

        # Find start node
        start_node = next((n for n in nodes.values() if n["type"] == "start"), None)
        if not start_node:
            print("❌ No start node found, defaulting to admin")
            return "admin"

        # Find first edge from start
        next_edge = next((e for e in edges if e["from"] == start_node["id"]), None)
        if not next_edge:
            print("❌ No edge from start node, defaulting to admin")
            return "admin"

        next_node = nodes.get(next_edge["to"])
        if not next_node:
            print("❌ Next node not found, defaulting to admin")
            return "admin"

        # Decide handler
        if next_node["type"] == "ai":
            print("✅ Flow says AI should handle")
            return "ai"
        elif next_node["type"] == "human":
            print("✅ Flow says Admin should handle")
            return "admin"
        else:
            print("❌ Unknown node type, defaulting to admin")
            return "admin"

    except Exception as e:
        print("❌ Failed to parse flow_json:", e)
        return "admin"

def _send_bot_message(db, room_id, organisation_id, response, sender="bot"):
    """
    Send bot message to guest & admin. Handles text and options properly.
    response = build_response(node)
    """
    if not response:
        return

    msg_type = response["type"]

    if msg_type == "text":
        msg_payload = {
            "senderId": sender,
            "msg": response["text"],
            "type": "text",
            "createdAt": datetime.utcnow().isoformat(),
        }

    elif msg_type == "options":
        msg_payload = {
            "senderId": sender,
            "msg": response.get("text", "Please choose:"),
            "type": "options",
            "options": response.get("options", []),
            "createdAt": datetime.utcnow().isoformat(),
        }

    elif msg_type == "collect":
        msg_payload = {
            "senderId": sender,
            "msg": response.get("text", ""),
            "type": "collect",
            "fields": response.get("fields", []),
            "createdAt": datetime.utcnow().isoformat(),
        }

    else:
        msg_payload = {
            "senderId": sender,
            "msg": "🤖 AI is ready.",
            "type": msg_type,
            "createdAt": datetime.utcnow().isoformat(),
        }

    # Save in DB
    bot_msg_db = ChatMessage(
        room_id=room_id,
        sender_id=sender,
        message=json.dumps(msg_payload),  # store structured
        type=msg_type,
        created_at=datetime.utcnow(),
    )
    db.add(bot_msg_db)
    db.commit()

    mqtt_payload = {"event": "new_message", "room_id": room_id, "message": msg_payload}
    publish_mqtt(f"guest/{room_id}", mqtt_payload)
    publish_mqtt(f"admin/{organisation_id}", mqtt_payload)

from .flow_engine import get_start_node, get_next_node, build_response

def _send_bot_message(db, room_id, organisation_id, text, sender="bot"):
    bot_msg_db = ChatMessage(
        room_id=room_id,
        sender_id=sender,
        message=text,
        type="text",
        created_at=datetime.utcnow(),
    )
    db.add(bot_msg_db)
    db.commit()

    mqtt_payload = {
        "event": "new_message",
        "room_id": room_id,
        "message": {
            "senderId": sender,
            "msg": text,
            "type": "text",
            "createdAt": datetime.utcnow().isoformat(),
        },
    }
    # Guest & Admin get the same bot message
    publish_mqtt(f"guest/{room_id}", mqtt_payload)
    publish_mqtt(f"admin/{organisation_id}", mqtt_payload)




IN_MEMORY_COLLECTS = {}  # room_id -> {"node_id": "...", "index": 0, "fields": [...], "answers": {}}

# --- helpers for in-memory collect handling ---

def _init_collect_in_memory(room_id: str, node: dict):
    """
    Initialize an in-memory collect state for a room.
    node: the collect node dict from the flow JSON.
    """
    fields = node.get("fields", []) or []
    IN_MEMORY_COLLECTS[room_id] = {
        "node_id": node.get("id"),
        "index": 0,
        "fields": fields,
        "answers": {},
    }
    print(f"🟢 Initialized collect for room {room_id}: fields -> {[f.get('variable') for f in fields]}")
    return IN_MEMORY_COLLECTS[room_id]

def _ask_current_collect_question_in_memory(db, widget, room_id):
    """
    Send the current question for the in-memory collect.
    Returns True if question sent, False if no question left.
    """
    state = IN_MEMORY_COLLECTS.get(room_id)
    if not state:
        return False
    idx = state["index"]
    fields = state["fields"]
    if idx < 0 or idx >= len(fields):
        return False
    label = fields[idx].get("label") or fields[idx].get("variable") or f"Question {idx+1}"
    # send question to guest via mqtt & DB record
    _send_bot_message(db, room_id, widget.organisation_id, label)
    print(f"❓ Sent collect question to {room_id}: {label}")
    return True

def _process_collect_answer_in_memory(db, widget, room_id, incoming_text: str):
    """
    Process an incoming message as the answer for current collect question.
    Returns:
      - ("continue", None)  => still collecting, next question already sent
      - ("done", answers_dict) => collection finished, answers returned (printed)
      - ("no_collect", None) => nothing to do
    """
    state = IN_MEMORY_COLLECTS.get(room_id)
    if not state:
        return "no_collect", None

    idx = state["index"]
    fields = state["fields"]

    # Defensive
    if idx < 0 or idx >= len(fields):
        # nothing to collect -> cleanup
        IN_MEMORY_COLLECTS.pop(room_id, None)
        return "no_collect", None

    variable = fields[idx].get("variable") or f"field_{idx}"
    # store answer
    state["answers"][variable] = incoming_text
    print(f"🖨️ Collected for room {room_id}: {variable} = {incoming_text!r}")

    # advance
    state["index"] = idx + 1

    # If more remain -> ask next question and keep state
    if state["index"] < len(fields):
        IN_MEMORY_COLLECTS[room_id] = state
        _ask_current_collect_question_in_memory(db, widget, room_id)
        return "continue", None

    # All collected -> print final answers, clear state
    final_answers = state["answers"]
    print(f"✅ Collect complete for room {room_id}. Final answers: {json.dumps(final_answers)}")
    IN_MEMORY_COLLECTS.pop(room_id, None)
    return "done", final_answers


def _ensure_flow_started(db, widget, session):
    """
    If the session has no current_node_id, jump from Start to the next node
    and send whatever that node dictates (text/options/ai-ready).
    """
    if not widget.flow_json:
        return

    try:
        flow_json = widget.flow_json if isinstance(widget.flow_json, dict) else json.loads(widget.flow_json)
    except Exception as e:
        print("⚠️ Could not parse flow_json in _ensure_flow_started:", e)
        return

    if session.current_node_id:
        return  # already positioned in the flow

    start_node = get_start_node(flow_json)
    if not start_node:
        return

    next_node, response = get_next_node(flow_json, start_node["id"], "")
    if not response:
        # still store where we are if there is a next node
        session.current_node_id = next_node["id"] if next_node else None
        db.commit()
        return

    # Send initial bot message based on first node after Start
    if response["type"] == "text":
        _send_bot_message(db, session.room_id, widget.organisation_id, response["text"])
    elif response["type"] == "options":
        prompt = response.get("text") or "Please choose:"
        bot_msg = prompt + " " + ", ".join(response["options"])
        _send_bot_message(db, session.room_id, widget.organisation_id, bot_msg)
    elif response["type"] == "ai":
        _send_bot_message(db, session.room_id, widget.organisation_id, "🤖 AI is ready to answer.")
    elif response["type"] == "collect":
        _init_collect_in_memory(session.room_id, next_node)
        _ask_current_collect_question_in_memory(db, widget, session.room_id)

    session.current_node_id = next_node["id"] if next_node else None
    db.commit()

@router.post("/api/chat/reset_flow")
def reset_flow(room_id: str = Form(...), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter_by(room_id=room_id).first()
    if session:
        session.current_node_id = None
        session.last_active = datetime.utcnow()
        db.commit()
        print(f"🔄 Flow reset for room {room_id}")
        return {"status": "ok", "message": "Flow reset"}
    return {"status": "error", "message": "Session not found"}


@router.post("/api/chat/send")
async def handle_mqtt_message(
    senderId: str = Form(...),
    msg: str = Form(...),
    type: str = Form(...),
    createdAt: str = Form(...),
    widget_token: str = Form(...),
    room_id: str = Form(...),
    db: Session = Depends(get_db),
    request: Request = None,
):
    print("\n📩 New message received")
    print("Sender:", senderId, "| Room:", room_id, "| Msg:", msg)

    # --- Validate widget token ---
    widget = db.query(Widget).filter(Widget.token == widget_token).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Invalid widget token")

    # --- Save incoming message ---
    msg_db = ChatMessage(
        room_id=room_id,
        sender_id=senderId,
        message=msg,
        type=type,
        created_at=isoparse(createdAt),
    )
    db.add(msg_db)

    # --- Session handling ---
    session = db.query(ChatSession).filter_by(room_id=room_id).first()
    is_new = False
    if not session:
        session = ChatSession(
            guest_id=senderId,
            room_id=room_id,
            widget_id=widget.id,
            last_message=msg,
            last_active=datetime.utcnow(),
            current_node_id=None,
        )
        db.add(session)
        is_new = True
    else:
        session.last_message = msg
        session.last_active = datetime.utcnow()

    db.commit()

    # --- Admin direct message passthrough ---
    if senderId == "admin":
        print("👨‍💻 Admin message, forwarding to guest")

        topic = f"guest/{room_id}"
        payload = {
            "event": "new_message",
            "room_id": room_id,
            "message": {"senderId": senderId, "msg": msg, "type": type, "createdAt": createdAt},
        }
        publish_mqtt(topic, payload)

        session.current_node_id = "admin_responded"
        session.last_active = datetime.utcnow()
        db.commit()

        return {"status": "ok", "new_guest": is_new, "handler": "admin"}

    # --- Ensure flow is positioned ---
    _ensure_flow_started(db, widget, session)

    handler = "bot"

    # --- If in-memory collect active ---
    if room_id in IN_MEMORY_COLLECTS:
        result_type, payload = _process_collect_answer_in_memory(db, widget, room_id, msg)

        # notify admin
        topic = f"admin/{widget.organisation_id}"
        payload_admin = {
            "event": "new_message",
            "room_id": room_id,
            "message": {"senderId": senderId, "msg": msg, "type": type, "createdAt": createdAt},
            "new_guest": is_new,
            "widget_token": widget.token,
        }
        publish_mqtt(topic, payload_admin)

        # --- If collect finished, continue flow ---
        if result_type == "done":
            try:
                flow_json = widget.flow_json if isinstance(widget.flow_json, dict) else json.loads(widget.flow_json)
            except Exception as e:
                print("⚠️ Could not parse flow_json:", e)
                return {"status": "ok", "new_guest": is_new, "handler": handler}

            current_node_id = session.current_node_id
            while True:
                next_node, response = get_next_node(flow_json, current_node_id, "")
                if not next_node or not response:
                    break

                print("➡️ Flow step after collect | from:", current_node_id, "| next:", next_node["id"])

                if response["type"] == "text":
                    _send_bot_message(db, session.room_id, widget.organisation_id, response["text"])

                elif response["type"] == "options":
                    prompt = response.get("text") or "Please choose:"
                    options_text = prompt + " " + ", ".join(response["options"])
                    _send_bot_message(db, session.room_id, widget.organisation_id, options_text)
                    current_node_id = next_node["id"]
                    break

                elif response["type"] == "ai":
                    handler = "ai"
                    session.handler = "ai"
                    db.commit()
                    break

                elif response["type"] == "collect":
                    _init_collect_in_memory(session.room_id, next_node)
                    _ask_current_collect_question_in_memory(db, widget, session.room_id)
                    current_node_id = next_node["id"]
                    break

                elif response["type"] == "human_handoff":
                    handoff_info = response
                    wait_time = handoff_info.get("time", 10)

                    print(f"🟢 Sending 'connecting to human' message to room {session.room_id}")
                    _send_bot_message(db, session.room_id, widget.organisation_id,
                                    "⏳ Please wait, connecting you to a human agent...")

                    session.current_node_id = next_node["id"]
                    db.commit()

                    import threading, time
                    def fallback_timer(room_id, org_id, node_id, fallback_text, wait_time, flow_json):
                        ...
                        # same code as below in main block
                    threading.Thread(
                        target=fallback_timer,
                        args=(session.room_id, widget.organisation_id, next_node["id"],
                            handoff_info.get("text", "No human available"),
                            wait_time, flow_json),
                        daemon=True
                    ).start()
                    break  # Stop main loop


                current_node_id = next_node["id"]

            session.current_node_id = current_node_id
            db.commit()

        return {"status": "ok", "new_guest": is_new, "handler": handler}

    # --- Normal flow ---
    flow_json = None
    if widget.flow_json:
        try:
            flow_json = widget.flow_json if isinstance(widget.flow_json, dict) else json.loads(widget.flow_json)
        except Exception as e:
            print("⚠️ Could not parse flow_json:", e)

    if flow_json and session.current_node_id:
        current_node_id = session.current_node_id
        while True:
            next_node, response = get_next_node(flow_json, current_node_id, msg)
            if not next_node or not response:
                break

            print("➡️ Flow step | from:", current_node_id, "| user:", msg, "| next:", next_node["id"])

            if response["type"] == "text":
                _send_bot_message(db, room_id, widget.organisation_id, response["text"])

            elif response["type"] == "options":
                prompt = response.get("text") or "Please choose:"
                bot_msg = prompt + " " + ", ".join(response["options"])
                _send_bot_message(db, room_id, widget.organisation_id, bot_msg)
                current_node_id = next_node["id"]
                break

            elif response["type"] == "ai":
                handler = "ai"
                session.handler = "ai"
                db.commit()
                break

            elif response["type"] == "collect":
                _init_collect_in_memory(session.room_id, next_node)
                _ask_current_collect_question_in_memory(db, widget, session.room_id)
                current_node_id = next_node["id"]
                break

            elif response["type"] == "human_handoff":
                handoff_info = response
                wait_time = handoff_info.get("time", 10)

                # 1️⃣ Send immediate waiting message
                print(f"🟢 Sending 'connecting to human' message to room {session.room_id}")
                _send_bot_message(db, session.room_id, widget.organisation_id,
                                "⏳ Please wait, connecting you to a human agent...")

                # 2️⃣ Update session to stop auto-advance
                current_node_id = next_node["id"]
                session.current_node_id = current_node_id
                db.commit()
                print(f"🟢 Session updated, current_node_id={current_node_id}")

                # 3️⃣ Start fallback thread with debug
                import threading, time

                def fallback_timer(room_id, org_id, node_id, fallback_text, wait_time, flow_json):
                    print(f"⏱️ Thread started for room {room_id}, waiting {wait_time} sec")
                    time.sleep(wait_time)
                    print(f"⏱️ Wait finished, checking session for room {room_id}")

                    db_thread = SessionLocal()
                    try:
                        s = db_thread.query(ChatSession).filter_by(room_id=room_id).first()
                        if not s:
                            print("❌ Session not found in thread")
                            return

                        print(f"🟢 Current node in DB thread: {s.current_node_id}, expected: {node_id}")
                        if s.current_node_id == node_id:
                            print(f"💬 Sending fallback message: {fallback_text}")
                            _send_bot_message(db_thread, s.room_id, org_id, fallback_text)

                            # Move to next node if exists
                            next_next_node, resp = get_next_node(flow_json, node_id, "")
                            if next_next_node:
                                s.current_node_id = next_next_node["id"]
                                if resp and resp["type"] == "text":
                                    print(f"💬 Sending next text node: {resp['text']}")
                                    _send_bot_message(db_thread, s.room_id, org_id, resp["text"])
                                db_thread.commit()
                                print(f"🟢 DB thread committed next node {next_next_node['id']}")
                    finally:
                        db_thread.close()
                        print(f"🟢 Thread for room {room_id} finished")

                threading.Thread(
                    target=fallback_timer,
                    args=(
                        session.room_id,
                        widget.organisation_id,
                        next_node["id"],
                        handoff_info.get("text", "No human available"),
                        wait_time,
                        flow_json
                    ),
                    daemon=True
                ).start()

                break  # Stop main loop

            current_node_id = next_node["id"]

        session.current_node_id = current_node_id
        db.commit()

    # --- Notify admin panel ---
    topic = f"admin/{widget.organisation_id}"
    payload_admin = {
        "event": "new_message",
        "room_id": room_id,
        "message": {"senderId": senderId, "msg": msg, "type": type, "createdAt": createdAt},
        "new_guest": is_new,
        "widget_token": widget.token,
    }
    publish_mqtt(topic, payload_admin)

    # --- AI Handling ---
    RAG_API_URL = "http://rag-chatbot:8000"
    if handler == "ai":
        try:
            organisation_id = widget.organisation_id
            index_rows = db.query(WidgetIndex).filter(WidgetIndex.widget_id == widget.id).all()
            website_ids = []

            if widget.ai_website_id:
                website_ids.append(widget.ai_website_id)

            website_ids.extend(
                row.index_name
                for row in index_rows
            )
            print("Final website_ids =", website_ids)

            if not website_ids:
                _send_bot_message(db, room_id, organisation_id, "⚠️ No knowledge base found.", sender="ai")
                return {"status": "ok", "new_guest": is_new, "handler": handler}

            payload = {
                "widget_id": widget.id,
                "website_id": website_ids,
                "query": msg,
                "session_id": room_id,
                "model": "gemma3:1b",
                "top_k": 2,
                "memory_window": 3,
            }

            async with httpx.AsyncClient(timeout=160.0) as client:
                response = await client.post(f"{RAG_API_URL}/get_answer", json=payload)

            if response.status_code != 200:
                print(f"❌ RAG API error: {response.status_code}")
                ai_msg = "⚠️ Sorry, I couldn't get an answer right now."
            else:
                data = response.json()
                ai_msg = data.get("response", "🤖 I don't know how to respond.")

            _send_bot_message(db, room_id, organisation_id, ai_msg, sender="ai")

        except Exception as e:
            print("❌ Failed to get AI response:", e)
            _send_bot_message(db, room_id, widget.organisation_id,
                "⚠️ Sorry, there was an error getting AI response.", sender="ai")

    return {"status": "ok", "new_guest": is_new, "handler": handler}

JWT_SECRET = os.getenv('JWT_SECRET')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM')

def clean_domain(domain: str) -> str:
    domain = domain.strip()

    # If starts with http or https — return as is
    if domain.startswith("http://") or domain.startswith("https://"):
        return domain

    # If no protocol and ends with slash -> add https
    if domain.endswith("/"):
        return f"https://{domain}"

    # If no protocol and no slash — return untouched
    return domain


def domain_to_ai_format(domain: str) -> str:
    """
    Convert a clean domain into AI format.
    Example: 'example.com' -> 'example-com'
    """
    return clean_domain(domain).replace(".", "-")

RAG_API_URL = "http://rag-chatbot:8000"
EMBEDDING_INDEX_DIR = "/app/data/indexes"

@router.post("/widgets", response_model=WidgetOut)
def create_widget(widget_data: WidgetCreate, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    # Clean domains if provided
    cleaned_domains = [
        clean_domain(d) for d in widget_data.allowed_domains
    ] if getattr(widget_data, "allowed_domains", None) else []

    # Create widget first to get widget.id
    widget = Widget(
        name=widget_data.name,
        allowed_domains=cleaned_domains,
        organisation_id=user.organisation_id,
        created_by_user_id=user.uuid
    )
    db.add(widget)
    db.commit()
    db.refresh(widget)
    logger.info(f"✅ Widget created with ID {widget.id}")

    # ✅ Handle special index naming
    special_indexes = getattr(widget_data, "special_indexes", None)
    if special_indexes and len(special_indexes) > 0:
        user_index = special_indexes[0].strip()
        prefix = user_index[:5] if len(user_index) >= 5 else user_index
        final_index_name = f"{prefix}_{widget.id}"
        widget.ai_website_id = final_index_name
        logger.info(f"💾 Assigned ai_website_id: {final_index_name}")

    # Generate token
    payload = {
        "organisation_id": user.organisation_id,
        "widget_id": widget.id,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    widget.token = token

    db.commit()
    db.refresh(widget)

    # ✅ Call the rag-chatbot API to create markdown folder + demo file
    try:
        url = f"{RAG_API_URL}/create_markdown/{widget.id}"
        logger.info(f"📡 Calling RAG API: {url}")
        response = httpx.post(url, timeout=10.0)
        if response.status_code == 200:
            logger.info(f"✅ Markdown created for widget {widget.id}")
        else:
            logger.warning(f"⚠️ Markdown creation failed ({response.status_code}): {response.text}")
    except Exception as e:
        logger.error(f"❌ Error calling RAG markdown API for widget {widget.id}: {e}")

    return widget

@router.get("/widgets")
def get_widgets(db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    widgets = (
        db.query(Widget)
        .filter(Widget.organisation_id == current_user.organisation_id)
        .order_by(Widget.created_at.desc())
        .all()
    )
    return widgets

from starlette.status import HTTP_403_FORBIDDEN
@router.post("/widgets/validate-domain")
def validate_widget_post(data: dict = Body(...), db: Session = Depends(get_db)):
    token = data.get("widget_token")
    origin = data.get("current_domain")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        widget_id = payload["widget_id"]
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid token")

    widget = db.query(Widget).filter(Widget.id == widget_id).first()

    if not widget:
        raise HTTPException(status_code=403, detail="Widget not found")

    allowed_domains = widget.allowed_domains or ""
    if isinstance(allowed_domains, str):
        allowed = [d.strip() for d in allowed_domains.split(",")]
    else:
        allowed = [d.strip() for d in allowed_domains]

    if origin not in allowed:
        raise HTTPException(status_code=403, detail="Domain not allowed")

    return {"status": "allowed"}

@router.get("/api/messages/{room_id}")
def get_chat_messages(room_id: str, db: Session = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.room_id == room_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Not found")

    widget = db.query(Widget).filter(Widget.id == session.widget_id).first()
    if widget.organisation_id != current_user.organisation_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "room_id": m.room_id,
            "senderId": m.sender_id,
            "msg": m.message,
            "type": m.type,
            "createdAt": m.created_at.replace(tzinfo=timezone.utc).isoformat()
        }
        for m in messages
    ]

@router.get("/api/widgets/{widget_id}/flow")
def get_widget_flow(widget_id: int, db: Session = Depends(get_db)):
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        return {"error": "Widget not found"}
    return {"flow_json": widget.flow_json or {}}




@router.post("/api/widgets/{widget_id}/flow")
def save_widget_flow(widget_id: int, payload: dict, db: Session = Depends(get_db)):
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        return {"error": "Widget not found"}

    widget.flow_json = payload.get("flow_json", {})

    # Normalize incoming instruction nodes
    incoming_nodes = []
    flow_json = payload.get("flow_json") or {}
    nodes = flow_json.get("nodes") if isinstance(flow_json, dict) else None

    if isinstance(nodes, list):
        for n in nodes:
            node_type = n.get("type", "").lower()
            if node_type == "instruction" or (n.get("text") and n.get("type") == "instruction"):
                node_id = str(n.get("id")) if n.get("id") is not None else None
                instruction_text = (n.get("text") or n.get("instruction_text") or "").strip()
                if instruction_text:
                    incoming_nodes.append({"node_id": node_id, "instruction_text": instruction_text})
    else:
        for idx in payload.get("indexes", []):
            incoming_nodes.append({
                "node_id": idx.get("id") or idx.get("node_id"),
                "instruction_text": (idx.get("instruction_text") or idx.get("text") or "").strip(),
                "index_name": idx.get("index_name")
            })

    db_indexes = db.query(WidgetIndex).filter(WidgetIndex.widget_id == widget_id).all()
    db_by_index_name = {idx.index_name: idx for idx in db_indexes}
    db_by_text = {}
    for idx in db_indexes:
        db_by_text.setdefault(idx.instruction_text, []).append(idx)

    used_index_names = set()
    to_build = []

    def gen_index_name(widget_id: int, node_id: str = None):
        short = uuid.uuid4().hex[:6]
        if node_id:
            safe_node = str(node_id).replace(" ", "_")[:30]
            return f"widget_{widget_id}_{safe_node}_{short}"
        return f"widget_{widget_id}_{short}"

    # Process incoming nodes (new or updated)
    for n in incoming_nodes:
        node_id = n.get("node_id")
        text = n.get("instruction_text", "").strip()
        provided_index_name = n.get("index_name")

        matched_db_idx = None
        if provided_index_name and provided_index_name in db_by_index_name:
            matched_db_idx = db_by_index_name[provided_index_name]

        if not matched_db_idx and node_id:
            for idx_name, db_idx in db_by_index_name.items():
                if f"_{str(node_id)}_" in idx_name or idx_name.startswith(f"widget_{widget_id}_{node_id}_"):
                    matched_db_idx = db_idx
                    break

        if not matched_db_idx:
            candidates = db_by_text.get(text)
            if candidates:
                for c in candidates:
                    if c.index_name not in used_index_names:
                        matched_db_idx = c
                        break

        if matched_db_idx:
            used_index_names.add(matched_db_idx.index_name)
            if matched_db_idx.instruction_text != text:
                # Delete old files before rebuild
                try:
                    delete_url = f"{RAG_API_URL}/delete_index/{matched_db_idx.index_name}/{widget_id}"
                    with httpx.Client(timeout=60) as client:
                        resp = client.delete(delete_url)
                        if resp.status_code == 200:
                            print(f"🗑️ Deleted old index: {matched_db_idx.index_name}")
                        else:
                            print(f"⚠️ Failed to delete {matched_db_idx.index_name}: {resp.status_code} {resp.text}")
                except Exception as e:
                    print(f"❌ Error deleting old index {matched_db_idx.index_name}: {e}")

                matched_db_idx.instruction_text = text
                db.add(matched_db_idx)
                to_build.append({"index_name": matched_db_idx.index_name, "instruction_text": text})
        else:
            new_index_name = gen_index_name(widget_id, node_id)
            new_idx = WidgetIndex(
                widget_id=widget_id,
                instruction_text=text,
                index_name=new_index_name
            )
            db.add(new_idx)
            used_index_names.add(new_index_name)
            to_build.append({"index_name": new_index_name, "instruction_text": text})

    # Handle deletions (removed instruction nodes)
    removed_index_names = [idx.index_name for idx in db_indexes if idx.index_name not in used_index_names]
    for rm in removed_index_names:
        db_idx = db_by_index_name.get(rm)
        if db_idx:
            db.delete(db_idx)
        try:
            delete_url = f"{RAG_API_URL}/delete_index/{rm}/{widget_id}"
            with httpx.Client(timeout=60) as client:
                resp = client.delete(delete_url)
                if resp.status_code == 200:
                    print(f"🗑️ Deleted removed index: {rm}")
                else:
                    print(f"⚠️ Failed to delete {rm}: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"❌ Error deleting index {rm}: {e}")

    db.commit()

    # Call RAG API for new/updated indexes
    for item in to_build:
        payload_data = {
            "website_id": item["index_name"],
            "contents": item["instruction_text"],
            "chunk_size": 550,
            "widget_id": widget_id,
            "overlap": 150,
        }
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(f"{RAG_API_URL}/create_addon", json=payload_data)
                if resp.status_code == 200:
                    print(f"✅ RAG index created/updated: {item['index_name']}")
                else:
                    print(f"❌ RAG API failed for {item['index_name']}: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"❌ Error calling RAG API for {item['index_name']}: {e}")

    return {"success": True}
