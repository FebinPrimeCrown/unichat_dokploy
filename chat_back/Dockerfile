# Use Python 3.11 (needed for FAISS and langchain)
FROM python:3.10-slim
# Set working directory
WORKDIR /app

# Install system dependencies (FAISS etc.)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy all backend files (app/, main.py, chatbot.py, etc.)
COPY . .

# Create directories used for embeddings or data (from college project)
RUN mkdir -p /app/data/markdown /app/data/indexes

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI using uvicorn (as in your setup)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
