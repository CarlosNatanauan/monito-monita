// Landing page "Try a bunutan" checks (signature moment 1):
//   1. frame rate of the bowl draw (rise + unfold) with 4x CPU throttling
//   2. GSAP is lazy: not part of the first page load, fetched on intent/idle
//   3. reduced motion: no GSAP, the open slip is shown
//   4. the landing page is static (served from the prerender, no DB)
//   5. the light string twinkle: 3 opacity-only animations, idle frame rate at 4x, none under reduced motion
//
// Run against a PRODUCTION build, not `next dev`:
//   npm run build && npx next start -p 3100
//   node scripts/perf/landing-perf.mjs http://localhost:3100
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const RUNS = 4;
const DRAW_MS = 2700; // rise (~0.6s) + unfold (~2.1s)
const browser = await chromium.launch();

/** Records the JS files the page downloads, and whether one is GSAP. */
function watchJs(page) {
  const files = [];
  page.on("response", async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.text().catch(() => "");
    files.push({ url: r.url(), gsap: body.includes("GreenSock"), at: Date.now() });
  });
  return files;
}

// 1. Frame rate during the draw.
console.log(`Bowl draw frame rate, 4x CPU throttling, Pixel 7 (${RUNS} runs):`);
for (let run = 1; run <= RUNS; run++) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "load" });
  const bowl = page.getByRole("button", { name: "Tap the bowl para bumunot" });
  await bowl.hover(); // intent: fetch the draw chunk, as a finger would
  await page.waitForTimeout(2000);
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
      if (window.__frames.length < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await bowl.evaluate((button) => {
    window.__tap = performance.now();
    button.click();
  });
  await page.getByRole("button", { name: "Tap ulit para bumunot ng iba" }).waitFor({ timeout: 20_000 });
  const { frames, longTasks } = await page.evaluate((ms) => {
    const end = window.__tap + ms;
    return {
      frames: window.__frames.filter(([t]) => t > window.__tap && t < end).map(([, d]) => d),
      longTasks: window.__longTasks,
    };
  }, DRAW_MS);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const sorted = [...frames].sort((a, b) => a - b);
  console.log(
    `  run ${run}: ${(1000 / avg).toFixed(1)} fps avg, p95 ${sorted[Math.floor(frames.length * 0.95)].toFixed(1)}ms, ` +
      `worst ${sorted.at(-1).toFixed(1)}ms, frames over 34ms: ${frames.filter((d) => d > 34).length}/${frames.length}, ` +
      `long tasks: ${longTasks}`,
  );
  await ctx.close();
}

// 2. Lazy loading: nothing animation-related in the first load; fetched on tap.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  // No idle prefetch during this check: report what the page itself loads.
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
  });
  const js = watchJs(page);
  await page.goto(base, { waitUntil: "networkidle" });
  const firstLoad = js.length;
  const before = js.some((f) => f.gsap);
  await page.getByRole("button", { name: "Tap the bowl para bumunot" }).click();
  await page.getByRole("button", { name: "Tap ulit para bumunot ng iba" }).waitFor({ timeout: 20_000 });
  const after = js.some((f) => f.gsap);
  console.log(
    `Lazy GSAP: first load (${firstLoad} JS files) ${before ? "HAS GSAP (bad)" : "no GSAP"}, after tapping ${after ? "loaded" : "NOT LOADED (bad)"}`,
  );
  await ctx.close();
}

// 3. Reduced motion.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const js = watchJs(page);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Tap the bowl para bumunot" }).click();
  await page.waitForTimeout(1000);
  const name = await page.locator("[data-sample-slip]").getAttribute("data-sample-slip");
  const open = await page.locator('[data-sample-slip] [data-part="flat"]').evaluate((el) => getComputedStyle(el).opacity);
  console.log(`Reduced motion: GSAP ${js.some((f) => f.gsap) ? "LOADED (bad)" : "not loaded"}, slip "${name}" open: ${open === "1"}`);
  await ctx.close();
}

// 4. Static.
const res = await fetch(base);
console.log(`Static: x-nextjs-cache "${res.headers.get("x-nextjs-cache")}", cache-control "${res.headers.get("cache-control")}"`);

// 5. The light string's twinkle: three opacity-only animations, smooth at 4x
//    throttling with nothing else moving, none under reduced motion.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  const anims = await page.evaluate(() =>
    document.getAnimations()
      .filter((a) => a.effect?.target?.closest?.("[data-light-string]"))
      .map((a) => [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p))))].join(",")),
  );
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const { frames, longTasks } = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [];
        let longTasks = 0;
        new PerformanceObserver((l) => (longTasks += l.getEntries().length)).observe({ type: "longtask" });
        let last = performance.now();
        const start = last;
        const tick = (t) => {
          frames.push(t - last);
          last = t;
          if (t - start < 5000) requestAnimationFrame(tick);
          else resolve({ frames: frames.slice(1), longTasks });
        };
        requestAnimationFrame(tick);
      }),
  );
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const sorted = [...frames].sort((a, b) => a - b);
  console.log(
    `Light string twinkle: ${anims.length} animations (${[...new Set(anims)].join(" | ") || "none"}); ` +
      `idle 5s at 4x: ${(1000 / avg).toFixed(1)} fps avg, p95 ${sorted[Math.floor(frames.length * 0.95)].toFixed(1)}ms, ` +
      `worst ${sorted.at(-1).toFixed(1)}ms, frames over 34ms: ${frames.filter((d) => d > 34).length}/${frames.length}, long tasks: ${longTasks}`,
  );
  await ctx.close();

  const rm = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const still = await rm.newPage();
  await still.goto(base, { waitUntil: "networkidle" });
  const r = await still.evaluate(() => ({
    anims: document.getAnimations().filter((a) => a.effect?.target?.closest?.("[data-light-string]")).length,
    opacity: [...document.querySelectorAll("[data-light-string] .ls-halo")].map((el) => getComputedStyle(el).opacity),
  }));
  console.log(`Light string, reduced motion: ${r.anims} animations, halo opacity ${r.opacity.join(", ")} (lit, static)`);
  await rm.close();
}

await browser.close();
