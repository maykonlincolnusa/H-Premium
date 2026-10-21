FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY scripts/download_model.py ./scripts/download_model.py
RUN python scripts/download_model.py
COPY src ./src
COPY models ./models
ENV PYTHONPATH=/app/src
CMD sh -c "uvicorn vista_ai.main:app --host 0.0.0.0 --port ${PORT}"
