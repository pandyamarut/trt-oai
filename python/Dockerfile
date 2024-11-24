# python/Dockerfile
FROM ubuntu:22.04

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install
COPY python/requirements.txt .
RUN pip3 install -r requirements.txt

# Copy Python server files
COPY python/server.py .

# Create cache directory
RUN mkdir -p /var/cache/tensorrt-llm

EXPOSE 8000

CMD ["python3", "server.py", "${MODEL_PATH}"]