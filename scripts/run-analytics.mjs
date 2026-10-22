import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = new URL("../services/analytics-python/", import.meta.url);
const venv = fileURLToPath(
  new URL(
    process.platform === "win32"
      ? ".venv/Scripts/python.exe"
      : ".venv/bin/python",
    root,
  ),
);
const executable =
  process.env.ANALYTICS_PYTHON ||
  (existsSync(venv)
    ? venv
    : process.platform === "win32"
      ? "python"
      : "python3");
const child = spawn(
  executable,
  [
    "-m",
    "uvicorn",
    "nexus_analytics.app:app",
    "--host",
    process.env.ANALYTICS_BIND_ADDRESS || "127.0.0.1",
    "--port",
    process.env.ANALYTICS_PORT || "8001",
    "--no-access-log",
  ],
  {
    cwd: fileURLToPath(root),
    stdio: "inherit",
    env: {
      ...process.env,
      OPENBLAS_NUM_THREADS: "1",
      OMP_NUM_THREADS: "1",
      MKL_NUM_THREADS: "1",
    },
  },
);
child.on("error", () => {
  console.error(
    "No se pudo iniciar Python. Sigue la instalación de analítica del README.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
