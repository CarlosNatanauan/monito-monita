import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The tests talk to the DEV database (for cleanup) via .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Same port as `npm run dev`. Next 16 allows only one dev server per
// project folder, so an already-running dev server is reused.
const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // One flow per phone, run one after the other so the dev server isn't
  // compiling pages for two browsers at once.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // One long flow per phone. WebKit takes ~5.5 minutes on a Windows dev
  // machine (it was already ~5 before the redesign), so leave headroom.
  timeout: 480_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "android-pixel-7", use: { ...devices["Pixel 7"] }, testIgnore: /reveal\.spec\.ts/ },
    { name: "iphone-14", use: { ...devices["iPhone 14"] }, testIgnore: /reveal\.spec\.ts/ },
    // The party reveal on a projector laptop (Chromium, 1920×1080; the spec also checks 1366×768 and 1280×720).
    {
      name: "projector-1080p",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
      testMatch: /reveal\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
