FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src src
RUN mvn -B package -DskipTests
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S nexus && adduser -S nexus -G nexus
WORKDIR /app
COPY --from=build /src/target/nexus-api-0.2.0.jar app.jar
USER nexus
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
