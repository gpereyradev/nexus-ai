# One public service; PostgreSQL remains external and durable.
FROM node:24-bookworm-slim AS web
WORKDIR /src
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund
COPY apps/web apps/web
ENV VITE_DEPLOYMENT_MODE=public
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-17 AS api
WORKDIR /src
COPY services/api-java/pom.xml ./
COPY services/api-java/src src
RUN mvn -B package -DskipTests

FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 \
    SPRING_PROFILES_ACTIVE=public
RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jre-headless ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 nexus
WORKDIR /app
COPY services/analytics-python/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=web /src/apps/web/dist /app/web
COPY --from=api /src/target/nexus-api.jar /app/nexus-api.jar
COPY services/analytics-python/nexus_analytics /app/nexus_analytics
COPY infra/public/start.py /app/start.py
USER nexus
EXPOSE 10000
CMD ["python", "/app/start.py"]
