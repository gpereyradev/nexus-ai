import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "VITE_");
  return {
    plugins: [react()],
    envDir: root,
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": env.VITE_API_PROXY || "http://127.0.0.1:8080" },
    },
    preview: { host: "127.0.0.1", port: 4173 },
  };
});
