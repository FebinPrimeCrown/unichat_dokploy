# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Install system dependencies needed for FAISS and other packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy ALL application files
COPY main.py .
COPY api.py .
COPY utils.py .
COPY embedder.py .
COPY .env .

# Create directories for data storage
RUN mkdir -p /app/data/markdown /app/data/index

# Expose the port your FastAPI app runs on
EXPOSE 8006

# Command to run the application
CMD ["python", "main.py"]