// The landing's small bowl on "Paano 'to?" (signature moment 1):
//   1. frame rate of the bowl draw (mix + rise + unfold) with 4x CPU throttling
//   2. GSAP is lazy: not in the first load, not after idle or scrolling to the
//      bowl, only on the bowl's pointer down / focus / key down
//   3. reduced motion: no GSAP, the open slip is shown
//   4. the landing page is static (served from the prerender, no DB)
//   5. the mix: every tap leaves the bowl's slips in a new arrangement
//      (reduced motion: they never move)
//   (the light string's modes have their own script: scripts/perf/lights-perf.mjs)
//
// Run against a PRODUCTION build, not `next dev`:
//   npm run build && npx next start -p 3100
//   node scripts/perf/landing-perf.mjs http://localhost:3100
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const RUNS = 4;
const DRAW_MS = 3200; // mix (0.7s) + rise (0.35s) + unfold (~2.1s)
const browser = await chromium.launch();

/** The bowl's slips' positions and turns (rounded), as one string. */
const bowlSlips = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-bunutan] [data-bowl-slip]")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        // Page coordinates: a tap may scroll the page.
        return `${Math.round(r.left + scrollX)},${Math.round(r.top + scrollY)},${getComputedStyle(el).transform}`;
      })
      .join("|"),
  );

/** Clicks the bowl and waits until a new name is shown (the draw is over). */
async function drawOnce(page) {
  const prev = await page.locator("[data-bunutan] [data-sample-slip]").getAttribute("data-sample-slip").catch(() => null);
  await page.getByRole("button", { name: /sample na bunutan$/ }).click();
  await waitShown(page, prev);
}
const waitShown = (page, prev) =>
  page.waitForFunction(
    (p) => {
      const el = document.querySelector("[data-bunutan]");
      return el?.dataset.phase === "shown" && el.querySelector("[data-sample-slip]")?.dataset.sampleSlip !== p;
    },
    prev,
    { timeout: 20_000 },
  );

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
  const bowl = page.getByRole("button", { name: "Bumunot ka: sample na bunutan" });
  await bowl.scrollIntoViewIfNeeded();
  await bowl.focus(); // intent: fetch the draw chunk (as a finger's pointer down would)
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
  await waitShown(page, null);
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
  const js = watchJs(page);
  await page.goto(base, { waitUntil: "networkidle" });
  const firstLoad = js.length;
  const before = js.some((f) => f.gsap);
  // Idle time and scrolling the bowl into view load nothing either.
  await page.getByRole("button", { name: "Bumunot ka: sample na bunutan" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  const idle = js.some((f) => f.gsap);
  await drawOnce(page);
  const after = js.some((f) => f.gsap);
  console.log(
    `Lazy GSAP: first load (${firstLoad} JS files) ${before ? "HAS GSAP (bad)" : "no GSAP"}, ` +
      `after idle + scrolling to the bowl ${idle ? "HAS GSAP (bad)" : "no GSAP"}, after tapping ${after ? "loaded" : "NOT LOADED (bad)"}`,
  );
  await ctx.close();
}

// 3. Reduced motion.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const js = watchJs(page);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Bumunot ka: sample na bunutan" }).scrollIntoViewIfNeeded();
  const before = await bowlSlips(page);
  await page.getByRole("button", { name: "Bumunot ka: sample na bunutan" }).click();
  await page.waitForTimeout(1000);
  const name = await page.locator("[data-sample-slip]").getAttribute("data-sample-slip");
  const open = await page.locator('[data-sample-slip] [data-part="riser"] [data-part="flat"]').evaluate((el) => getComputedStyle(el).opacity);
  const still = (await bowlSlips(page)) === before;
  console.log(
    `Reduced motion: GSAP ${js.some((f) => f.gsap) ? "LOADED (bad)" : "not loaded"}, slip "${name}" open: ${open === "1"}, ` +
      `bowl slips ${still ? "not moved (no shake or tumble)" : "MOVED (bad)"}`,
  );
  await ctx.close();
}

// 5. The mix: every tap leaves the bowl's slips in a new arrangement.
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  const seen = [await bowlSlips(page)];
  await drawOnce(page);
  seen.push(await bowlSlips(page));
  for (let k = 0; k < 2; k++) {
    await drawOnce(page);
    seen.push(await bowlSlips(page));
  }
  const fresh = seen.every((s, i) => i === 0 || s !== seen[i - 1]);
  console.log(`Mix: ${seen.length - 1} taps, ${fresh ? "a new arrangement of the bowl's slips after every tap" : "SAME arrangement twice (bad)"}`);
  await ctx.close();
}

// 4. Static.
const res = await fetch(base);
console.log(`Static: x-nextjs-cache "${res.headers.get("x-nextjs-cache")}", cache-control "${res.headers.get("cache-control")}"`);

await browser.close();
