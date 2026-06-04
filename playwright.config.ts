import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke-test config for Afro Miaam.
 *
 * Run against any reachable instance by setting PLAYWRIGHT_BASE_URL:
 *   PLAYWRIGHT_BASE_URL=https://afro-miaam.fr npx playwright test
 *
 * Defaults to http://localhost:3000 for local dev. The suite is intentionally
 * read-mostly and creates throwaway accounts using a unique email per run so
 * it can be re-executed without polluting the real DB.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fr-FR",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
