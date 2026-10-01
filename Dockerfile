# One container for Render: builds Angular, then FastAPI serves UI + /api
FROM node:20-alpine AS web
WORKDIR /src
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npx ng build --configuration production

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 ATP_STATIC_DIR=/app/static
COPY backend/requirements.txt backend/requirements-render.txt ./
RUN pip install --no-cache-dir -r requirements-render.txt
COPY backend/app ./app
COPY --from=web /src/dist/frontend/browser ./static
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
