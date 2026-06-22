#api.py

import os
import time
from fastapi import APIRouter, HTTPException, Body, Query, Request
from pydantic import BaseModel
from typing import Dict, Optional, List
import logging

from langchain_core.messages import HumanMessage, AIMessage
from utils import (
    get_chat_memory,
    create_index_for_website,
    create_addon_from_contents,
    get_vector_store,
    get_unified_context,
    calculate_semantic_similarity,
    extract_answer_only
)
        

logger = logging.getLogger(__name__)

router = APIRouter()

# Request Models
class CreateIndexRequest(BaseModel):
    website_id: str
    widget_id: int
    file_path: Optional[str] = None
    chunk_size: int = 550
    overlap: int = 150

class CreateAddonRequest(BaseModel):
    website_id: str
    contents: str
    widget_id: int
    chunk_size: int = 550
    overlap: int = 150

class QueryRequest(BaseModel):
    widget_id: int                               # 👈 NEW: to locate /data/indexes/{widget_id}/
    website_id: List[str]
    query: str
    session_id: str
    model: Optional[str] = "gemma3:1b"
    top_k: int = 2
    memory_window: int = 3

class GeneralQueryRequest(BaseModel):
    prompt: str
    session_id: str
    model: Optional[str] = "gemma3:1b"
    memory_window: int = 5

class SemanticMatchRequest(BaseModel):
    user_query: str
    keywords: List[str]

@router.get("/")
async def root(request: Request):
    return {
        "status": "active",
        "default_model": "gemma3:1b",
        "endpoints": ["/create_index", "/create_addon", "/get_answer", "/generate", "/semantic-match", "/indexes", "/health"],
        "description": "Optimized Multi-Index RAG API with unified search and addon support",
        "data_dir": str(request.app.state.DATA_DIR),
        "embedding_index_path": str(request.app.state.EMBEDDING_INDEX_PATH)
    }

@router.get("/health")
async def health_check(request: Request):
    total_vectors = sum(vs.index.ntotal for vs in request.app.state.vector_stores.values()) if hasattr(request.app.state, 'vector_stores') else 0
    
    # Count regular and addon indexes separately
    regular_count = 0
    addon_count = 0
    
    if hasattr(request.app.state, 'vector_stores'):
        for website_id, vs in request.app.state.vector_stores.items():
            try:
                sample_docs = vs.similarity_search("test", k=1)
                if sample_docs and sample_docs[0].metadata.get('index_type') == 'addon':
                    addon_count += 1
                else:
                    regular_count += 1
            except:
                regular_count += 1
    
    redis_status = "connected"
    try:
        request.app.state.redis_client.ping()
    except:
        redis_status = "failed"
    
    return {
        "status": "healthy",
        "total_indexes": len(request.app.state.vector_stores) if hasattr(request.app.state, 'vector_stores') else 0,
        "regular_indexes": regular_count,
        "addon_indexes": addon_count,
        "total_vectors": total_vectors,
        "redis_status": redis_status,
        "startup_metrics": getattr(request.app.state, 'startup_metrics', {}),
        "data_directories": {
            "data_dir": str(request.app.state.DATA_DIR),
            "embedding_index_path": str(request.app.state.EMBEDDING_INDEX_PATH)
        }
    }

INDEX_DIR = "/app/data/indexes"  # or wherever you store them

@router.get("/indexes")
async def list_indexes():
    """
    List all available FAISS indexes categorized by type,
    scanning /data/indexes/{widget_id}/ folders.
    """
    all_indexes = []
    regular_indexes = []
    addon_indexes = []

    # Walk through each widget folder
    if not os.path.exists(INDEX_DIR):
        return {"error": "Index directory not found", "all_indexes": []}

    for widget_id in os.listdir(INDEX_DIR):
        widget_path = os.path.join(INDEX_DIR, widget_id)
        if not os.path.isdir(widget_path):
            continue

        # Inside each widget folder, look for .pkl files (metadata)
        for file in os.listdir(widget_path):
            if file.endswith("_index.pkl"):
                index_name = file.replace("_index.pkl", "")
                index_path = os.path.join(widget_path, file)
                all_indexes.append(f"{widget_id}/{index_name}")

                # Determine if it's an addon or regular index
                try:
                    import pickle
                    with open(index_path, "rb") as f:
                        store_data = pickle.load(f)

                    # Check index type from stored metadata if available
                    if isinstance(store_data, dict):
                        meta = store_data.get("docstore", {}).get("docs", {})
                        first_doc = next(iter(meta.values()), None)
                        index_type = (
                            first_doc.metadata.get("index_type", "regular")
                            if first_doc and hasattr(first_doc, "metadata")
                            else "regular"
                        )
                    else:
                        index_type = "regular"
                except Exception:
                    index_type = "regular"

                if index_type == "addon":
                    addon_indexes.append(f"{widget_id}/{index_name}")
                else:
                    regular_indexes.append(f"{widget_id}/{index_name}")

    return {
        "all_indexes": all_indexes,
        "regular_indexes": regular_indexes,
        "addon_indexes": addon_indexes,
        "total_regular": len(regular_indexes),
        "total_addon": len(addon_indexes),
        "total_unified": len(all_indexes),
    }

@router.post("/create_index")
async def create_index(req: CreateIndexRequest, request: Request):
    """Create a new index for a website with configurable chunking (per widget_id folder)"""
    start_time = time.time()
    
    try:
        file_path = req.file_path or os.getenv("MARKDOWN_FILE_PATH", "/app/data/markdown/default.md")
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail=f"Invalid file path: {file_path}")
        
        # ✅ ensure embedding path is available
        embedding_path = request.app.state.EMBEDDING_INDEX_PATH or Path("/app/data/indexes")
        
        # ✅ now call with widget_id (same pattern as addon)
        vector_store = create_index_for_website(
            website_id=req.website_id,
            widget_id=req.widget_id,
            file_path=file_path,
            chunk_size=req.chunk_size,
            overlap=req.overlap,
            embedding_index_path=embedding_path
        )

        # Cache in memory
        request.app.state.vector_stores[req.website_id] = vector_store
        
        return {
            "message": f"Regular index created successfully for website_id: {req.website_id}",
            "website_id": req.website_id,
            "vectors_count": vector_store.index.ntotal,
            "chunk_size": req.chunk_size,
            "overlap": req.overlap,
            "chunking_method": f"Fixed-size ({req.chunk_size} chars with {req.overlap} overlap)",
            "index_type": "regular",
            "saved_path": str(embedding_path),
            "time_taken_s": round(time.time() - start_time, 3)
        }
        
    except Exception as e:
        logger.error(f"Failed to create index for {req.website_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create index: {str(e)}")

MARKDOWN_BASE_DIR = "/app/data/markdown"

@router.post("/create_markdown/{widget_id}")
async def create_markdown(widget_id: int):
    """
    Create a markdown folder for the given widget_id and a default demo markdown file.
    Example: /app/data/markdown/3/demo.md
    """
    try:
        # 1️⃣ Define folder path
        widget_dir = os.path.join(MARKDOWN_BASE_DIR, str(widget_id))
        os.makedirs(widget_dir, exist_ok=True)
        logger.info(f"📁 Markdown directory ready: {widget_dir}")

        # 2️⃣ Define markdown file path
        file_path = os.path.join(widget_dir, f"{widget_id}.md")

        # 3️⃣ If file doesn’t exist, create it
        if not os.path.exists(file_path):
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(f"# Demo content for Widget {widget_id}\n\n")
                f.write("This is a placeholder markdown file for testing indexing.\n")
            logger.info(f"✅ Markdown file created: {file_path}")
        else:
            logger.info(f" Markdown file already exists: {file_path}")

        return {
            "success": True,
            "widget_id": widget_id,
            "path": file_path,
            "message": "✅ Markdown folder and demo file created successfully"
        }

    except Exception as e:
        logger.error(f"❌ Failed to create markdown for widget {widget_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create markdown: {str(e)}")
    
@router.post("/create_addon")
async def create_addon(req: CreateAddonRequest, request: Request):
    """Create a new addon index from direct text contents"""
    start_time = time.time()
    
    try:
        if not req.contents.strip():
            raise HTTPException(status_code=400, detail="Contents cannot be empty")
        
        embeddingpath = "/app/data/indexes"
        vector_store = create_addon_from_contents(
            req.website_id, 
            req.widget_id,
            req.contents, 
            req.chunk_size, 
            req.overlap,
            embeddingpath
        )
        request.app.state.vector_stores[req.website_id] = vector_store
        
        return {
            "message": f"Addon index created successfully for website_id: {req.website_id}",
            "website_id": req.website_id,
            "vectors_count": vector_store.index.ntotal,
            "content_length": len(req.contents),
            "chunk_size": req.chunk_size,
            "overlap": req.overlap,
            "chunking_method": f"Fixed-size ({req.chunk_size} chars with {req.overlap} overlap)",
            "index_type": "addon",
            "time_taken_s": round(time.time() - start_time, 3)
        }
        
    except Exception as e:
        logger.error(f"Failed to create addon index for {req.website_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create addon index: {str(e)}")



@router.post("/get_answer")
async def process_query(req: QueryRequest, request: Request):
    """Query multiple indexes (Q&A + website data) with Q&A priority - supports multiple website_ids"""
    start_time = time.time()
    
    try:
        # Get memory
        memory = get_chat_memory(req.session_id, req.memory_window)
        
        # Get context from multiple indexes using unified search
        context, sources_used = get_unified_context(
            req.widget_id,
            req.website_id,
            req.query, 
            req.top_k
        )
        
        if not context:
            raise HTTPException(
                status_code=404, 
                detail=f"No relevant context found for website_ids: {req.website_id}"
            )
        
        # Format chat history + ADD CURRENT QUERY
        messages = memory.chat_memory.messages[-req.memory_window:] if memory.chat_memory.messages else []
        
        # Build conversation history including current query
        chat_history_parts = []
        for msg in messages:
            chat_history_parts.append(f"{'Human' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}")
        
        # Add current query to conversation context
        chat_history_parts.append(f"Human: {req.query}")
        chat_history = "\n".join(chat_history_parts)
        
        # Build optimized prompt with source priority instruction and table handling
        if messages:  # If there's previous conversation
            prompt = f"""Context: {context}

Instructions:
You are a chat agent. Be helpful, Respond only to the provided context. Present reply in a simple user-friendly formatting
Conversation:
{chat_history}

Answer the latest question based on the context and conversation history:"""
        else:  # First message in conversation
            prompt = f"""Context: {context}

Question: {req.query}

Instructions:
You are a chat agent. Be helpful, Respond only to the provided context. Present reply in a simple user-friendly formatting
Answer based on the context:"""
        
        # Call Ollama with optimized parameters
        generation_start = time.time()
        
        http_client = request.app.state.http_client
        if not http_client:
            raise HTTPException(status_code=500, detail="HTTP client not initialized")
        
        response = await http_client.post(
            f"{os.getenv('OLLAMA_BASE_URL')}/api/generate",
            headers={"Authorization": f"Basic {request.app.state.auth_token}"} if request.app.state.auth_token else {},
            json={
                "model": req.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.0,
                    "top_p": 0.5,
                    "top_k": 10,
                    "repeat_penalty": 1.0,
                    "num_gpu": 1,
                    "num_ctx": 2048,
                    "num_thread": -1
                }
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Ollama API error: {response.status_code}")
            raise HTTPException(status_code=500, detail=f"Ollama API error: {response.status_code}")
        
        result = response.json()
        ai_response = result.get("response", "")
        
        # Clean response to remove thinking tags
        ai_response = extract_answer_only(ai_response)
        
        generation_time = round(time.time() - generation_start, 3)
        
        if not ai_response:
            raise HTTPException(status_code=500, detail="Empty response from model")
        
        # Save to chat history
        memory.chat_memory.add_user_message(req.query)
        memory.chat_memory.add_ai_message(ai_response)
        
        total_time = round(time.time() - start_time, 3)
        
        return {
            "response": ai_response,
            "website_ids": req.website_id,
            "sources_used": sources_used,
            "session_id": req.session_id,
            "model_used": req.model,
            "generation_time_s": generation_time,
            "total_time_s": total_time,
            "context": context
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

@router.post("/generate")
async def process_general_query(
    request: Request,
    content: str = Body(..., media_type="text/plain"),
    prompt: str = Query(...),
    session_id: str = Query(...),
    model: str = Query("llama3.2:1b"),
    memory_window: int = Query(5)
):
    """Process general query with raw text content"""
    start_time = time.time()
    
    try:
        # Get memory for this session
        memory = get_chat_memory(session_id, memory_window)
        
        # Format chat history (limited)
        messages = memory.chat_memory.messages[-memory_window:] if memory.chat_memory.messages else []
        chat_history = "\n".join([
            f"{'Human' if isinstance(msg, HumanMessage) else 'Assistant'}: {msg.content}"
            for msg in messages
        ])
        
        # Build prompt with raw content
        if chat_history:
            full_prompt = f"""{prompt}

Previous conversation:
{chat_history}

Content to process:
{content}

Please respond exactly as instructed in your role:"""
        else:
            full_prompt = f"""{prompt}

Content to process:
{content}

Please respond exactly as instructed in your role:"""
        
        # Call Ollama with optimized parameters
        generation_start = time.time()
        
        http_client = request.app.state.http_client
        if not http_client:
            raise HTTPException(status_code=500, detail="HTTP client not initialized")
        
        response = await http_client.post(
            f"{os.getenv('OLLAMA_BASE_URL')}/api/generate",
            headers={"Authorization": f"Basic {request.app.state.auth_token}"} if request.app.state.auth_token else {},
            json={
                "model": model,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.7,       
                    "top_k": 20,        
                    "repeat_penalty": 1.1,  
                    "num_gpu": 1,
                    "num_ctx": 4096,       
                    "num_thread": -1        
                }
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Ollama API error: {response.status_code}")
            raise HTTPException(status_code=500, detail=f"Ollama API error: {response.status_code}")
        
        result = response.json()
        ai_response = result.get("response", "")
        generation_time = round(time.time() - generation_start, 3)
        
        if not ai_response:
            raise HTTPException(status_code=500, detail="Empty response from model")
        
        # Save to chat history (truncate content for history)
        memory.chat_memory.add_user_message(f"Process content: {content[:100]}...")
        memory.chat_memory.add_ai_message(ai_response)
        
        total_time = round(time.time() - start_time, 3)
        
        return {
            "response": ai_response,
            "session_id": session_id,
            "model_used": model,
            "generation_time_s": generation_time,
            "total_time_s": total_time
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"General query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"General query processing failed: {str(e)}")

@router.post("/semantic-match")
async def semantic_match(req: SemanticMatchRequest):
    """
    Calculate semantic similarity scores between a user query and keywords.
    Returns scores from 0-100 indicating semantic closeness.
    """
    start_time = time.time()
    
    try:
        if not req.user_query.strip():
            raise HTTPException(status_code=400, detail="User query cannot be empty")
        
        if not req.keywords or len(req.keywords) == 0:
            raise HTTPException(status_code=400, detail="Keywords list cannot be empty")
        
        # Remove duplicates and empty keywords
        cleaned_keywords = list(set([kw.strip() for kw in req.keywords if kw.strip()]))
        
        if not cleaned_keywords:
            raise HTTPException(status_code=400, detail="No valid keywords provided")
        
        logger.info(f"Calculating semantic similarity for query: '{req.user_query}' against {len(cleaned_keywords)} keywords")
        
        # Calculate similarity scores
        scores = calculate_semantic_similarity(req.user_query, cleaned_keywords)
        
        # Sort by score in descending order
        sorted_scores = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
        
        processing_time = round(time.time() - start_time, 3)
        
        return {
            "user_query": req.user_query,
            "scores": sorted_scores,
            "total_keywords": len(cleaned_keywords),
            "highest_match": {
                "keyword": max(sorted_scores.items(), key=lambda x: x[1])[0],
                "score": max(sorted_scores.values())
            },
            "processing_time_s": processing_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Semantic matching failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Semantic matching failed: {str(e)}")

@router.get("/chat_history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 20):
    """Get chat history for a specific session"""
    try:
        memory = get_chat_memory(session_id, limit)
        message_history = memory.chat_memory
        
        messages = message_history.messages[-limit:] if limit else message_history.messages
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "type": "human" if isinstance(msg, HumanMessage) else "ai",
                    "content": msg.content
                } for msg in messages
            ],
            "total_messages": len(message_history.messages)
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat_history/{session_id}")
async def delete_chat_history(session_id: str):
    """Delete chat history for a specific session"""
    try:
        memory = get_chat_memory(session_id, 1)
        memory.chat_memory.clear()
        
        return {"message": f"Chat history deleted for session_id: {session_id}"}
        
    except Exception as e:
        logger.error(f"Failed to delete chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

EMBEDDING_INDEX_DIR = "/app/data/indexes"

@router.delete("/delete_index/{website_id}/{widget_id}")
async def delete_index(website_id: str, widget_id: int):
    """Delete a specific addon or regular index inside the correct widget folder"""
    try:
        logger.info(f"🔍 DELETE request received for website_id={website_id}, widget_id={widget_id}")

        index_dir = os.path.join(EMBEDDING_INDEX_DIR, str(widget_id))
        logger.info(f"Index directory resolved to: {index_dir}")

        if not os.path.exists(index_dir):
            logger.warning(f"⚠️ Index directory does not exist: {index_dir}")
            raise HTTPException(status_code=404, detail=f"Index folder not found for widget_id={widget_id}")

        index_name = f"{website_id}_index"
        faiss_path = os.path.join(index_dir, f"{index_name}.faiss")
        pkl_path = os.path.join(index_dir, f"{index_name}.pkl")
        logger.info(f"FAISS path: {faiss_path}")
        logger.info(f"PKL path: {pkl_path}")

        deleted_files = []

        # Delete the files from disk
        for f in [faiss_path, pkl_path]:
            if os.path.exists(f):
                os.remove(f)
                deleted_files.append(f)
                logger.info(f"✅ Deleted file: {f}")
            else:
                logger.warning(f"⚠️ File not found: {f}")

        # If folder is empty after deletion, remove it
        if os.path.exists(index_dir) and not os.listdir(index_dir):
            os.rmdir(index_dir)
            logger.info(f"🗑️ Deleted empty folder: {index_dir}")
        else:
            logger.info(f"Folder not empty or does not exist after deletion: {index_dir}")

        return {
            "message": f"✅ Index deleted successfully for website_id={website_id}, widget_id={widget_id}",
            "deleted_files": deleted_files,
            "folder_cleaned": not os.path.exists(index_dir)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete index for {website_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete index: {str(e)}")
