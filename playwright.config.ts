import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The tests talk to the DEV database (for cleanup) via .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Same port as `npm run dev`. Next 16 allows only one dev server per
// project folder, so an already-running dev server is reused.
const PORT = 3000;

// The projector reveal and the 8-size layout sweep set their own screens.
// Anchored on the file name: flow-4-reveal.spec.ts is a phone spec.
const PROJECTOR_SPEC = /[\/]reveal\.spec\.ts$/;
const PHONE_IGNORE = /[\/](reveal|layouts)\.spec\.ts$/;
const LAPTOP_MATCH = /[\/](flow-\d-[\w-]+|layouts|persona-fixes|demo|states|landing)\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // One flow per phone, run one after the other so the dev server isn't
  // compiling pages for two browsers at once.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // The main flow is split in four specs (flow-1 … flow-4), each well
  // under this on WebKit on a Windows dev machine.
  timeout: 240_000,
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
    { name: "android-pixel-7", use: { ...devices["Pixel 7"] }, testIgnore: PHONE_IGNORE },
    { name: "iphone-14", use: { ...devices["iPhone 14"] }, testIgnore: PHONE_IGNORE },
    // The tablet and laptop layouts: the flow specs on an organizer's laptop
    // (Chromium, 1366×768), and every page at 8 sizes (layouts.spec.ts).
    {
      name: "laptop-1366",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
      testMatch: LAPTOP_MATCH,
    },
    // The party reveal on a projector laptop (Chromium, 1920×1080; the spec also checks 1366×768 and 1280×720).
    {
      name: "projector-1080p",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
      testMatch: PROJECTOR_SPEC,
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
