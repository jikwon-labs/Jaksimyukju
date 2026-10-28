import { defineConfig, devices } from "@playwright/test";

const mobile = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    { name: "light", use: { ...mobile, colorScheme: "light" } },
    { name: "dark", use: { ...mobile, colorScheme: "dark" } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
