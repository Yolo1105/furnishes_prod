import { defineConfig, devices } from "@playwright/test";
// Shared E2E env lives in a .mjs file so `scripts/run-e2e.mjs` can import it.
// @ts-expect-error -- no TS types for the sibling .mjs helper
import { E2E_PORT, e2eEnv } from "./e2e/env.mjs";

const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  timeout: 120_000,
  use: {
    baseURL: BASE_URL,
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-gl=swiftshader",
      ],
    },
  },
  projects: [
    {
      name: "landing",
      testMatch: /(?:landing-|routes\.spec)/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "account",
      testMatch: /account-/,
      workers: process.env.CI ? 2 : 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm start --port ${E2E_PORT} --hostname 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: e2eEnv(process.env),
  },
});
