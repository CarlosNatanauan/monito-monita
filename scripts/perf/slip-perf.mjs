// Slip unfold checks on /lab/slip (same component as /me):
//   1. frame rate of the real unfold with 4x CPU throttling (budget Android stand-in)
//   2. GSAP is lazy: not downloaded while the slip is off screen
//   3. reduced motion: no GSAP, focus lands on the result
//   4. the lab page is noindex
//
// Run against a PRODUCTION build, not `next dev`:
//   npm run build && npx next start -p 3100
//   node scripts/perf/slip-perf.mjs http://localhost:3100
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const RUNS = 4;
const browser = await chromium.launch();

/** Records which JS files the page downloads, and whether one is GSAP. */
function watchJs(page) {
  const files = [];
  page.on("response", async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.text().catch(() => "");
    files.push({ url: r.url(), gsap: body.includes("GreenSock"), bytes: body.length });
  });
  return files;
}

// 1. Frame rate during the unfold.
console.log(`Frame rate, 4x CPU throttling, Pixel 7 (${RUNS} runs):`);
for (let run = 1; run <= RUNS; run++) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(`${base}/lab/slip`, { waitUntil: "load" });
  await page.waitForTimeout(2000); // let the lazy chunks arrive and the timeline build
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    window.__frames = [];
    window.__longTasks = 0;
    new PerformanceObserver((list) => (window.__longTasks += list.getEntries().length)).observe({ type: "longtask" });
    let last = performance.now();
    const tick = (t) => {
      window.__frames.push([t, t - last]);
      last = t;
      if (window.__frames.length < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page
    .getByRole("button", { name: "Tap to open your bunutan" })
    .evaluate((button) => {
      window.__tap = performance.now();
      button.click();
    });
  await page.waitForFunction(() => window.__slipTimeline?.progress() === 1, null, { timeout: 20_000 });
  const { frames, longTasks } = await page.evaluate(() => {
    const end = window.__tap + window.__slipTimeline.duration() * 1000;
    return {
      frames: window.__frames.filter(([t]) => t > window.__tap && t < end).map(([, d]) => d),
      longTasks: window.__longTasks,
    };
  });
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const sorted = [...frames].sort((a, b) => a - b);
  console.log(
    `  run ${run}: ${(1000 / avg).toFixed(1)} fps avg, p95 ${sorted[Math.floor(frames.length * 0.95)].toFixed(1)}ms, ` +
      `worst ${sorted.at(-1).toFixed(1)}ms, frames over 34ms: ${frames.filter((d) => d > 34).length}/${frames.length}, ` +
      `long tasks: ${longTasks}`,
  );
  await ctx.close();
}

// 2. Lazy loading. The slip sits ~136px down; a 20px viewport plus the
// observer's 100px margin stays above it until we scroll.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 412, height: 20 } });
  const page = await ctx.newPage();
  const js = watchJs(page);
  await page.goto(`${base}/lab/slip`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const before = js.some((f) => f.gsap);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(2000);
  const after = js.some((f) => f.gsap);
  console.log(`Lazy GSAP: off screen ${before ? "LOADED (bad)" : "not loaded"}, after scrolling ${after ? "loaded" : "NOT LOADED (bad)"}`);
  await ctx.close();
}

// 3. Reduced motion.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const js = watchJs(page);
  await page.goto(`${base}/lab/slip`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tap to open your bunutan" }).click();
  await page.waitForTimeout(1000);
  const focus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  console.log(`Reduced motion: GSAP ${js.some((f) => f.gsap) ? "LOADED (bad)" : "not loaded"}, focus on "${focus}"`);
  await ctx.close();
}

// 4. noindex.
const res = await fetch(`${base}/lab/slip`);
const html = await res.text();
console.log(`noindex: header "${res.headers.get("x-robots-tag")}", meta ${/<meta name="robots" content="noindex/.test(html)}`);

await browser.close();
