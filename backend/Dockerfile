# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y build-essential gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip
RUN pip install -r /app/requirements.txt
RUN pip install gunicorn

COPY . /app

EXPOSE 8080
ENV PORT 8080

CMD ["sh", "-c", "gunicorn -w 4 -b 0.0.0.0:$PORT app:app"]

