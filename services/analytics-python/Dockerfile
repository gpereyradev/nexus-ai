FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home nexus
COPY nexus_analytics nexus_analytics
USER nexus
EXPOSE 8001
CMD ["python", "-m", "uvicorn", "nexus_analytics.app:app", "--host", "0.0.0.0", "--port", "8001", "--no-access-log"]
