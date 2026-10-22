import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const destination = new URL(".env", root);
const exists = existsSync(destination);
let content = exists ? readFileSync(destination, "utf8") : "";
const template = readFileSync(new URL(".env.example", root), "utf8");
for (const line of template.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (!match) continue;
  const [, key, initial] = match;
  if (new RegExp(`^${key}=`, "m").test(content)) continue;
  const value = key.endsWith("PASSWORD")
    ? randomBytes(24).toString("hex")
    : initial;
  content += `${content.endsWith("\n") || !content ? "" : "\n"}${key}=${value}\n`;
}
if (!exists || content !== readFileSync(destination, "utf8")) {
  writeFileSync(destination, content, {
    flag: exists ? "w" : "wx",
    mode: 0o600,
  });
}
console.log(
  `Configuración local lista: ${fileURLToPath(destination)}. Se conservaron los valores existentes. No la subas a GitHub.`,
);
