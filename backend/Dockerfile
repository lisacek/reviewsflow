FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Self-hosted sensible defaults; can be overridden by compose env
ENV DATABASE_URL=mysql+aiomysql://reviews:reviews@db:3306/reviews \
    HEADLESS=true \
    ALLOW_REGISTRATIONS=true \
    WORKER_COUNT=1 \
    MAX_PLAYWRIGHT_INSTANCES=2

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

