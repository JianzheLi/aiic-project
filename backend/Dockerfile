FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN sed -i \
        -e 's|http://deb.debian.org/debian-security|http://mirrors.aliyun.com/debian-security|g' \
        -e 's|http://deb.debian.org/debian|http://mirrors.aliyun.com/debian|g' \
        /etc/apt/sources.list.d/debian.sources

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-chi-sim \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir \
    -i http://mirrors.cloud.aliyuncs.com/pypi/simple/ \
    --trusted-host mirrors.cloud.aliyuncs.com \
    -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
