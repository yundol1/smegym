import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "html" : "list",

  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Auth tests (no stored session)
    {
      name: "auth-tests",
      testMatch: /auth\/.*/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Member tests (logged in as member)
    {
      name: "member-tests",
      testMatch: /member\/.*/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/member.json",
      },
    },

    // Admin tests (logged in as admin)
    {
      name: "admin-tests",
      testMatch: /admin\/.*/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
    },

    // Mobile viewport tests
    {
      name: "mobile-tests",
      testMatch: /member\/.*mobile.*/,
      use: {
        ...devices["iPhone 14"],
        storageState: "e2e/.auth/member.json",
      },
    },
  ],

  webServer: baseURL.includes("localhost")
    ? {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !isCI,
        timeout: 120000,
      }
    : undefined,
});
