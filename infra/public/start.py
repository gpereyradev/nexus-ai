"""Run Java and private Python in one small container; never log credentials."""
import os
import re
import signal
import subprocess
import sys
import time
from urllib.parse import unquote, urlsplit


class ConfigurationError(ValueError):
    pass


def environment(source):
    env = dict(source)
    connection = env.pop("DATABASE_URL", "")
    if connection:
        try:
            parsed = urlsplit(connection)
            name = unquote(parsed.path.removeprefix("/"))
            if (parsed.scheme not in {"postgres", "postgresql"}
                    or not parsed.hostname or not parsed.username or not parsed.password
                    or parsed.fragment or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]{0,62}", name)
                    or not re.fullmatch(r"[A-Za-z0-9.-]+", parsed.hostname)):
                raise ValueError()
            env.update(DB_HOST=parsed.hostname, DB_PORT=str(parsed.port or 5432),
                       DB_NAME=name, DB_USER=unquote(parsed.username),
                       DB_PASSWORD=unquote(parsed.password))
        except ValueError:
            raise ConfigurationError("DATABASE_URL no es una conexión PostgreSQL válida.") from None
    if not all(env.get(key) for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD")):
        raise ConfigurationError("Falta configurar la conexión PostgreSQL del alojamiento.")
    if env.get("ANALYTICS_ENABLED", "false").lower() == "true":
        key = env.get("ANALYTICS_API_KEY", "")
        if len(key) < 32 or key.startswith("CHANGE_ME"):
            raise ConfigurationError("Configura una clave interna de analítica aleatoria.")
    return env


def analytics_environment(env):
    # Python receives no database, bootstrap account or Spring credentials.
    return {key: value for key, value in env.items()
            if not key.startswith(("DB_", "DEMO_", "SPRING_"))
            and key != "DATABASE_URL"}


def stop(processes):
    for process in reversed(processes):
        if process.poll() is None:
            process.terminate()
    deadline = time.monotonic() + 15
    for process in processes:
        try:
            process.wait(timeout=max(0.1, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def main():
    try:
        env = environment(os.environ)
    except ConfigurationError as error:
        print(str(error), file=sys.stderr, flush=True)
        return 1
    running = True
    processes = []

    def shutdown(_signum, _frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    python_command = [sys.executable, "-m", "uvicorn", "nexus_analytics.app:app",
                      "--host", "127.0.0.1", "--port", "8001", "--workers", "1", "--no-access-log"]
    analytics = None
    try:
        if env.get("ANALYTICS_ENABLED", "false").lower() == "true":
            analytics = subprocess.Popen(python_command, env=analytics_environment(env))
            processes.append(analytics)
        api = subprocess.Popen([
            "java", "-Xms32m", "-Xmx160m", "-XX:MaxMetaspaceSize=128m",
            "-XX:ReservedCodeCacheSize=24m", "-Xss256k", "-XX:ActiveProcessorCount=1",
            "-XX:+UseSerialGC", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/nexus-api.jar"
        ], env=env)
        processes.append(api)
        retry_at = 0.0
        while running:
            if api.poll() is not None:
                print("Java terminó; se cerrará el servicio para permitir su reinicio.", flush=True)
                return api.returncode or 1
            if analytics is not None and analytics.poll() is not None and time.monotonic() >= retry_at:
                print("Reiniciando analítica; Java conserva inventario y ventas.", flush=True)
                processes.remove(analytics)
                analytics = subprocess.Popen(python_command, env=analytics_environment(env))
                processes.append(analytics)
                retry_at = time.monotonic() + 10
            time.sleep(0.5)
        return 0
    finally:
        stop(processes)


if __name__ == "__main__":
    sys.exit(main())
