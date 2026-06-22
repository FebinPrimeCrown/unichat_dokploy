from datetime import datetime, timedelta

# 🧠 In-memory handler tracking
session_owners = {}

def set_session_handler(room_id: str, handler: str = "ai"):
    session_owners[room_id] = {
        "handled_by": handler,
        "last_updated": datetime.utcnow()
    }

def get_session_handler(room_id: str) -> str:
    data = session_owners.get(room_id)
    if not data:
        return "admin"  # default to AI if no handler

    # Optional: reset to AI if inactive for 10 minutes
    if datetime.utcnow() - data["last_updated"] > timedelta(minutes=10):
        session_owners[room_id] = {
            "handled_by": "ai",
            "last_updated": datetime.utcnow()
        }
        return "ai"

    return data["handled_by"]
