import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const child = spawn("mvn", ["spring-boot:run"], {
  cwd: fileURLToPath(new URL("../services/api-java/", import.meta.url)),
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});
child.on("error", () => {
  console.error(
    "No se pudo ejecutar Maven. Instala Maven 3.9+ y comprueba mvn -v.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
