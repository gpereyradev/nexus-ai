import { defineConfig } from "@playwright/test";
// Never point this suite at a developer or production database: it creates data.
if (!process.env.DB_NAME?.endsWith("_e2e"))
  throw new Error(
    "E2E requiere una base de datos aislada cuyo nombre termine en _e2e.",
  );
const publicContainer = process.env.NEXUS_PUBLIC_E2E === "true";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: "list",
  use: {
    baseURL: publicContainer ? "https://127.0.0.1:15443" : "http://127.0.0.1:15173",
    ignoreHTTPSErrors: publicContainer, // Self-signed certificate in isolated CI only.
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: publicContainer ? [] : [
    {
      command: "node scripts/run-analytics.mjs",
      url: "http://127.0.0.1:18001/health",
      timeout: 60000,
      reuseExistingServer: false,
      env: {
        ANALYTICS_PORT: "18001",
        ANALYTICS_API_KEY: "e2e_fixture_internal_analytics_key_2026",
      },
    },
    {
      command: "java -jar services/api-java/target/nexus-api.jar",
      url: "http://127.0.0.1:18080/api/v1/health",
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        ANALYTICS_ENABLED: "true",
        ANALYTICS_URL: "http://127.0.0.1:18001",
        ANALYTICS_API_KEY: "e2e_fixture_internal_analytics_key_2026",
        API_PORT: "18080",
        API_BIND_ADDRESS: "127.0.0.1",
        SESSION_COOKIE_SECURE: "false",
        DEMO_ENABLED: "true",
        DEMO_DATA_ENABLED: "true",
        DEMO_ADMIN_PASSWORD: "e2e_fixture_admin_password_2026",
        DEMO_MANAGER_PASSWORD: "e2e_fixture_manager_password_2026",
        DEMO_ANALYST_PASSWORD: "e2e_fixture_analyst_password_2026",
        DEMO_VIEWER_PASSWORD: "e2e_fixture_viewer_password_2026",
      },
    },
    {
      command:
        "npm run dev --workspace @nexus/web -- --host 127.0.0.1 --port 15173",
      url: "http://127.0.0.1:15173",
      timeout: 60000,
      reuseExistingServer: false,
      env: { VITE_API_PROXY: "http://127.0.0.1:18080" },
    },
  ],
});
