#utils.py

import os
import time
import glob
import logging
import re
from typing import Dict, List
from pathlib import Path
import numpy as np

from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import Document
from sklearn.metrics.pairwise import cosine_similarity

from embedder import embedder

logger = logging.getLogger(__name__)

def get_redis_url() -> str:
    """Build Redis URL from environment variables"""
    redis_password = os.getenv('REDIS_PASSWORD', '')
    redis_host = os.getenv('REDIS_HOST')
    redis_port = os.getenv('REDIS_PORT')
    return f"redis://:{redis_password}@{redis_host}:{redis_port}"

def get_chat_memory(session_id: str, k: int = 5) -> ConversationBufferWindowMemory:
    """Get chat memory for a specific session"""
    try:
        redis_url = get_redis_url()
        message_history = RedisChatMessageHistory(session_id=session_id, url=os.getenv("REDIS_BROKER_URL"))
        return ConversationBufferWindowMemory(chat_memory=message_history, k=k, return_messages=True)
    except Exception as e:
        logger.error(f"Failed to create chat memory: {e}")
        raise

def load_existing_indexes(vector_stores: Dict, embedding_index_path: Path, embedder_instance):
    """Load all existing FAISS indexes from disk (both regular and addon indexes)"""
    try:
        index_dir = str(embedding_index_path)
        logger.info(f"Loading indexes from: {index_dir}")
        
        for faiss_file in glob.glob(f"{index_dir}/*_index.faiss"):
            try:
                base_name = os.path.basename(faiss_file).replace('.faiss', '')
                website_id = base_name.replace('_index', '')
                pkl_file = faiss_file.replace('.faiss', '.pkl')
                
                if os.path.exists(pkl_file):
                    logger.info(f"Loading existing index for website_id: {website_id}")
                    vector_store = FAISS.load_local(
                        folder_path=index_dir,
                        embeddings=embedder_instance,
                        index_name=base_name,
                        allow_dangerous_deserialization=True
                    )
                    
                    # Determine index type from metadata
                    try:
                        sample_docs = vector_store.similarity_search("test", k=1)
                        index_type = "addon" if sample_docs and sample_docs[0].metadata.get('index_type') == 'addon' else "regular"
                        logger.info(f"Loaded {index_type.upper()} index for {website_id} with {vector_store.index.ntotal} vectors")
                    except Exception as meta_e:
                        logger.info(f"Loaded REGULAR index for {website_id} with {vector_store.index.ntotal} vectors (default)")
                    
                    vector_stores[website_id] = vector_store
                        
            except Exception as e:
                logger.error(f"Failed to load index from {faiss_file}: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to load existing indexes: {e}")

def simple_chunk_text(text: str, chunk_size: int = 550, overlap: int = 150) -> List[str]:
    """
    Simple chunking function that creates fixed-size chunks with overlap.
    No splitting by separators - just pure character-based chunking.
    """
    if not text:
        return []
    
    chunks = []
    start = 0
    
    while start < len(text):
        # Get chunk from start to start + chunk_size
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        
        if chunk:  # Only add non-empty chunks
            chunks.append(chunk)
        
        # Move start forward by (chunk_size - overlap)
        # This ensures overlap between consecutive chunks
        start += (chunk_size - overlap)
        
        # If we've reached the end, break
        if end == len(text):
            break
    
    return chunks

def create_index_for_website(
    website_id: str,
    widget_id: int,
    file_path: str,
    chunk_size: int = 550,
    overlap: int = 150,
    embedding_index_path: Path = None
) -> FAISS:
    """Create a new index for a website from a markdown file, stored under data/indexes/{widget_id}/"""
    
    logger.info(f"Creating index for website_id={website_id}, widget_id={widget_id}, file={file_path}")
    logger.info(f"Using chunk_size={chunk_size}, overlap={overlap}")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Markdown file not found: {file_path}")
    
    # Read file
    with open(file_path, "r", encoding="utf-8") as file:
        raw_text = file.read()
    
    if not raw_text.strip():
        raise Exception(f"No content found in markdown file: {file_path}")
    
    # Chunk text
    text_chunks = simple_chunk_text(raw_text, chunk_size, overlap)
    if not text_chunks:
        raise Exception(f"No chunks created from file: {file_path}")
    
    # Prepare documents
    docs = []
    for i, chunk_text in enumerate(text_chunks):
        docs.append(Document(
            page_content=chunk_text,
            metadata={
                "source": file_path,
                "chunk_id": i,
                "chunk_size": len(chunk_text),
                "website_id": website_id,
                "widget_id": widget_id,
                "configured_chunk_size": chunk_size,
                "configured_overlap": overlap,
                "index_type": "regular",
            }
        ))

    # ✅ Create folder: /app/data/indexes/{widget_id}/
    base_dir = str(embedding_index_path)
    widget_dir = os.path.join(base_dir, str(widget_id))
    os.makedirs(widget_dir, exist_ok=True)

    # ✅ Save the index inside that folder
    index_name = f"{website_id}_index"
    vector_store = FAISS.from_documents(docs, embedder)
    vector_store.save_local(folder_path=widget_dir, index_name=index_name)

    logger.info(f"✅ Saved index for widget_id={widget_id} in folder: {widget_dir}")
    print("embedding_index_path:", embedding_index_path)
    print("widget_dir:", widget_dir)
    
    return vector_store

def create_addon_from_contents(
    website_id: str,
    widget_id: int,
    contents: str,
    chunk_size: int = 550,
    overlap: int = 150,
    embedding_index_path: Path = None
) -> FAISS:
    """Create a new addon index from direct text contents"""
    logger.info(f"Creating ADDON index for website_id: {website_id} (widget_id={widget_id})")
    
    if not contents.strip():
        raise Exception(f"No content provided for addon index: {website_id}")
    
    text_chunks = simple_chunk_text(contents, chunk_size, overlap)
    if not text_chunks:
        raise Exception(f"No chunks created from contents for: {website_id}")

    docs = []
    for i, chunk_text in enumerate(text_chunks):
        docs.append(Document(
            page_content=chunk_text,
            metadata={
                "source": "addon_contents",
                "chunk_id": i,
                "chunk_size": len(chunk_text),
                "website_id": website_id,
                "widget_id": widget_id,
                "configured_chunk_size": chunk_size,
                "configured_overlap": overlap,
                "index_type": "addon",
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        ))

    # ✅ Create per-widget folder
    base_dir = str(embedding_index_path)
    index_dir = os.path.join(base_dir, str(widget_id))
    os.makedirs(index_dir, exist_ok=True)

    index_name = f"{website_id}_index"
    vector_store = FAISS.from_documents(docs, embedder)
    vector_store.save_local(folder_path=index_dir, index_name=index_name)
    logger.info(f"fooooooolder {index_dir}")
    print("embedding_index_path:", embedding_index_path)
    print("index_dir:", index_dir)

 

    logger.info(f"✅ Created ADDON index for widget_id={widget_id} in {index_dir}")

    return vector_store

def get_vector_store(website_id: str, vector_stores: Dict, embedding_index_path: Path = None) -> FAISS:
    """Get the vector store for a specific website_id"""
    if website_id in vector_stores:
        return vector_stores[website_id]
    
    # Try to load from disk
    index_dir = str(embedding_index_path)
    index_name = f"{website_id}_index"
    faiss_path = f"{index_dir}/{index_name}.faiss"
    pkl_path = f"{index_dir}/{index_name}.pkl"
    
    if os.path.exists(faiss_path) and os.path.exists(pkl_path):
        logger.info(f"Loading index for {website_id} from disk")
        vector_store = FAISS.load_local(
            folder_path=index_dir,
            embeddings=embedder,
            index_name=index_name,
            allow_dangerous_deserialization=True
        )
        vector_stores[website_id] = vector_store
        return vector_store
    
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Index not found for website_id: {website_id}")
def get_unified_context(widget_id: int, website_ids: List[str], query: str, top_k: int = 2) -> tuple:
    """
    Unified context builder:
    - Dynamically loads FAISS indexes from /app/data/indexes/{widget_id}/
    - Searches across all given website_ids
    - Combines best results into one unified context
    """
    all_results = []
    sources_used = []

    # Path to the folder where this widget's indexes are stored
    base_dir = f"/app/data/indexes/{widget_id}"
    if not os.path.exists(base_dir):
        logger.warning(f"No index directory found for widget_id={widget_id}")
        return "", []

    # Single embedding for the query (expensive operation)
    query_embedding = embedder.embed_query(query)

    for website_id in website_ids:
        try:
            index_name = f"{website_id}_index"

            faiss_file = os.path.join(base_dir, f"{index_name}.faiss")
            pkl_file = os.path.join(base_dir, f"{index_name}.pkl")

            if not (os.path.exists(faiss_file) and os.path.exists(pkl_file)):
                logger.warning(f"❌ Index files missing for website_id={website_id} in widget_id={widget_id}")
                continue

            # ✅ Correct way to load from flat file structure
            vector_store = FAISS.load_local(
                folder_path=base_dir,
                index_name=index_name,
                embeddings=embedder,
                allow_dangerous_deserialization=True
            )

            # Perform similarity search
            docs_and_scores = vector_store.similarity_search_with_score_by_vector(query_embedding, k=top_k)

            for doc, score in docs_and_scores:
                index_type = doc.metadata.get("index_type", "regular")
                all_results.append({
                    "doc": doc,
                    "score": score,
                    "source_id": website_id,
                    "type": index_type
                })
                logger.info(f"🔍 Found doc in {index_type} index {website_id} (widget {widget_id}) with score={score:.4f}")

        except Exception as e:
            logger.warning(f"⚠️ Failed to query index {website_id} in widget {widget_id}: {e}")

    # Sort all results by score (lower = better)
    all_results.sort(key=lambda x: x["score"])

    # Combine top results into a single context string
    context_parts = []
    for result in all_results:
        context_parts.append(result["doc"].page_content)
        sources_used.append(f"{result['source_id']} ({result['type']})")

    combined_context = "\n\n".join(context_parts).strip()
    ranking_str = ", ".join(f"{r['source_id']}({r['score']:.3f})" for r in all_results)
    logger.info(f"🏁 Unified context ranking for widget {widget_id}: {ranking_str}")

    return combined_context, sources_used

def calculate_semantic_similarity(query: str, keywords: List[str]) -> Dict[str, float]:
    """Calculate semantic similarity scores between query and keywords using embeddings"""
    try:
        # Get embedding for the user query
        query_embedding = embedder.embed_query(query)
        query_vector = np.array(query_embedding).reshape(1, -1)
        
        # Get embeddings for all keywords
        keyword_embeddings = []
        for keyword in keywords:
            keyword_embedding = embedder.embed_query(keyword)
            keyword_embeddings.append(keyword_embedding)
        
        keyword_vectors = np.array(keyword_embeddings)
        
        # Calculate cosine similarity between query and each keyword
        similarities = cosine_similarity(query_vector, keyword_vectors)[0]
        
        # Convert to scores (0-100 scale)
        # Cosine similarity ranges from -1 to 1, we'll map to 0-100
        scores = {}
        for i, keyword in enumerate(keywords):
            score = ((similarities[i] + 1) / 2) * 100
            scores[keyword] = round(score, 1)
        
        return scores
        
    except Exception as e:
        logger.error(f"Error calculating semantic similarity: {str(e)}")
        raise

def extract_answer_only(response_text: str) -> str:
    """Extract final answer, remove thinking tags"""
    # Remove <think>...</think> blocks
    cleaned = re.sub(r'<think>.*?</think>\s*', '', response_text, flags=re.DOTALL)
    # Remove incomplete <think> tags at the end
    cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()