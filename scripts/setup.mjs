import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const destination = new URL(".env", root);
if (existsSync(destination)) {
  console.log(
    "Se conserva tu .env existente. No se modificó ninguna credencial.",
  );
} else {
  const template = readFileSync(new URL(".env.example", root), "utf8");
  writeFileSync(
    destination,
    template.replace(
      "DB_PASSWORD=CHANGE_ME_LOCAL_ONLY",
      `DB_PASSWORD=${randomBytes(24).toString("hex")}`,
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    `Configuración local creada: ${fileURLToPath(destination)}. No la subas a GitHub.`,
  );
}
