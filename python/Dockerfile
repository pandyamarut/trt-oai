# python/Dockerfile
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libopenmpi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /python

# Copy requirements first for better caching
COPY python/requirements.txt .
RUN pip3 install -r requirements.txt

# Copy the Python files
COPY python/*.py .

# Create cache directory
RUN mkdir -p /var/cache/tensorrt-llm

EXPOSE 8000

# Run using the Python directory directly
CMD ["python3", "server.py", "TinyLlama/TinyLlama-1.1B-Chat-v1.0"]