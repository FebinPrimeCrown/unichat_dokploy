#main.py

from contextlib import asynccontextmanager
import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import logging
import redis
import httpx
import base64
from typing import Dict

from embedder import embedder
from api import router
from utils import load_existing_indexes

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_env_path(env_var: str, default_path: str) -> Path:
    """Get environment path with proper validation and defaults"""
    env_value = os.getenv(env_var)
    if env_value is None:
        logger.warning(f"Environment variable {env_var} not set, using default: {default_path}")
        return Path(default_path)
    return Path(env_value)

try:
    EMBEDDING_INDEX_PATH = get_env_path("EMBEDDING_INDEX_PATH", "/app/data/indexes")
    DATA_DIR = EMBEDDING_INDEX_PATH.parent
    DATA_DIR.mkdir(exist_ok=True, parents=True)
    EMBEDDING_INDEX_PATH.mkdir(exist_ok=True, parents=True)
    
    logger.info(f"Data directory: {DATA_DIR}")
    logger.info(f"Embedding index path: {EMBEDDING_INDEX_PATH}")
except Exception as e:
    logger.error(f"Failed to create data directories: {e}")

    DATA_DIR = Path("/app/data")
    EMBEDDING_INDEX_PATH = Path("/app/data/indexes")
    DATA_DIR.mkdir(exist_ok=True, parents=True)
    EMBEDDING_INDEX_PATH.mkdir(exist_ok=True, parents=True)

required_env_vars = ['OLLAMA_BASE_URL', 'REDIS_HOST', 'REDIS_PORT']
missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    logger.error(f"Missing required environment variables: {missing_vars}")
    raise ValueError(f"Required environment variables not set: {missing_vars}")

try:
    REDIS_HOST = os.getenv("REDIS_HOST")
    REDIS_PORT = int(os.getenv("REDIS_PORT"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None  # Empty string -> None
    
    redis_client = redis.from_url(os.getenv("REDIS_BROKER_URL"), decode_responses=True)

    redis_client.ping()
    logger.info(f"Redis connection successful: {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    raise  # Fail fast in production

http_client = None

try:
    username = os.getenv('OLLAMA_USERNAME', 'user')
    password = os.getenv('OLLAMA_PASSWORD', 'pass')
    auth_token = base64.b64encode(f"{username}:{password}".encode()).decode()
except Exception as e:
    logger.warning(f"Failed to create auth token: {e}")
    auth_token = ""

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    startup_metrics = {}
    start_time = time.time()
    
    logger.info("Starting Multi-Index RAG API...")
    
    try:
        http_client = httpx.AsyncClient(timeout=90.0)
        logger.info("HTTP client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize HTTP client: {e}")
        raise

    try:
        redis_client.ping()
        logger.info("Redis connection verified")   # test connection
    except Exception as e:
        logger.warning(f"Redis connection issue: {e}")
    
    try:
        test_start = time.time()
        test_embed = embedder.embed_query("test")       # test & warmup
        startup_metrics["embedder_test_s"] = round((time.time() - test_start), 3)
        logger.info(f"Embedder ready (dim={len(test_embed)})")
    except Exception as e:
        logger.error(f"Embedder initialization failed: {e}")
        raise
    
    app.state.vector_stores = {}         # Initialize vector stores
    try:
        load_start = time.time()
        load_existing_indexes(app.state.vector_stores, EMBEDDING_INDEX_PATH, embedder)
        startup_metrics["load_existing_indexes_s"] = round((time.time() - load_start), 3)
    except Exception as e:
        logger.warning(f"Failed to load existing indexes: {e}")
        app.state.vector_stores = {}
    
    startup_metrics["total_startup_s"] = round((time.time() - start_time), 3)
    app.state.startup_metrics = startup_metrics
    
    app.state.redis_client = redis_client     # Store shared resources
    app.state.http_client = http_client
    app.state.auth_token = auth_token
    app.state.DATA_DIR = DATA_DIR
    app.state.EMBEDDING_INDEX_PATH = EMBEDDING_INDEX_PATH
    
    logger.info(f"API startup completed in {startup_metrics['total_startup_s']}s")
    
    yield

    try:
        if http_client:
            await http_client.aclose()
        logger.info("Multi-Index RAG API shutdown completed")
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"])

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=os.getenv("HOST", "0.0.0.0"), 
        port=int(os.getenv("PORT", "8000"))
    )