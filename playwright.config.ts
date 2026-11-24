import { defineConfig } from "@playwright/test";

// End-to-end smoke tests. They only READ from the shop (and use the browser's own storage for
// the cart), so they never place an order or change data. Run them with `npm run e2e`; they use
// the installed Chrome, so no browser download is needed. They are not part of the CI because
// the app needs the Supabase environment variables to start.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    trace: "off",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
