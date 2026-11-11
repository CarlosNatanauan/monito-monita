// Screenshots of the slip unfold at fixed points of the timeline, for
// checking the look frame by frame. Works against `next dev` or a build.
// The gold stars may be missing from seeked frames: the confetti worker
// hasn't drawn yet after a jump. Check the sparkle with real playback.
//   node scripts/perf/slip-frames.mjs [baseUrl] [outDir]
//   TIMES=0.3,0.8,1.5 node scripts/perf/slip-frames.mjs
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const [base = "http://localhost:3000", out = "test-results/slip-frames"] = process.argv.slice(2);
const times = (process.env.TIMES ?? "0.2,0.35,0.5,0.7,0.85,1.1,1.25,1.4,1.6,1.8,2.6").split(",").map(Number);
mkdirSync(out, { recursive: true });

// Never hang forever on one step.
const withTimeout = (promise, ms = 10_000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);

const browser = await chromium.launch();
const page = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
await page.goto(`${base}/lab/slip`);
await page.waitForTimeout(2500);
const box = await page.locator('section[aria-label="Your monito"]').boundingBox();
const clip = { x: 0, y: Math.max(0, box.y - 10), width: 412, height: box.height + 20 };

await withTimeout(page.screenshot({ path: `${out}/folded.png`, clip }));
await page.getByRole("button", { name: "Tap to open your bunutan" }).click();
await page.waitForFunction(() => !!window.__slipTimeline);
await withTimeout(page.evaluate(() => window.__slipTimeline.pause()));
for (const t of times) {
  // suppressEvents=false so the name prep and the sparkle run when seeking.
  await withTimeout(page.evaluate((t) => window.__slipTimeline.seek(t, false), t));
  await page.waitForTimeout(150);
  const name = `t-${t.toFixed(2)}s.png`;
  await withTimeout(page.screenshot({ path: `${out}/${name}`, clip }));
  console.log(`${out}/${name}`);
}
await browser.close();
