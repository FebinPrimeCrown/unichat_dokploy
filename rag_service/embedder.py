# embedder.py
import os
import httpx
import base64
from typing import List
from langchain_core.embeddings import Embeddings
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class CustomOllamaEmbedding(Embeddings):
    def __init__(self):
        auth_str = f"{os.getenv('OLLAMA_USERNAME')}:{os.getenv('OLLAMA_PASSWORD')}"
        self.auth_token = base64.b64encode(auth_str.encode()).decode()
        self.client = httpx.Client(timeout=60.0)
        
    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Basic {self.auth_token}",
            "Content-Type": "application/json"
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        try:
            payload = {
                "model": os.getenv("EMBEDDING_MODEL"),
                "input": texts
            }
            response = self.client.post(
                f"{os.getenv('OLLAMA_BASE_URL')}/v1/embeddings",
                headers=self._get_headers(),
                json=payload
            )
            response.raise_for_status()
            return [item["embedding"] for item in response.json()["data"]]
        except Exception as e:
            logger.error(f"Embedding failed: {str(e)}")
            raise

    def embed_query(self, text: str) -> List[float]:
        return self.embed_documents([text])[0]

# Initialize the embedding model
embedder = CustomOllamaEmbedding()