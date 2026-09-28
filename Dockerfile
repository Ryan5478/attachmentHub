FROM python:3.14-slim

WORKDIR /app

# Install system dependencies (if any are required by your libraries)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

# Render automatically injects the $PORT environment variable
CMD uvicorn main:app --host 0.0.0.0 --port $PORT