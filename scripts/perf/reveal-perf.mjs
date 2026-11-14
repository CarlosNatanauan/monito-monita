// Party reveal checks (signature moment 4), on /lab/reveal (made-up names):
//   1. frame rate of Next (12 and 30 members) and the finale at 2x CPU
//      throttling, on a 1920×1080 laptop
//   2. GSAP is lazy (not in the page's own scripts, fetched after it's up);
//      confetti only once the last pair is on screen
//   3. reduced motion: cross-fades, no GSAP, no confetti
//   4. after every kind of transition the ring is exactly what a fresh load
//      of that step shows (so a refresh mid-reveal is always right)
//   5. the lab is noindex
//
// Run against a PRODUCTION build, not `next dev`:
//   npm run build && npx next start -p 3100
//   node scripts/perf/reveal-perf.mjs http://localhost:3100
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const RUNS = 3;
const LAPTOP = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };
const browser = await chromium.launch();

const lab = (q) => `${base}/lab/reveal?${q}`;
const idle = (page) =>
  page.waitForFunction(() => !document.querySelector(".rv-stage")?.hasAttribute("data-animating"), null, { timeout: 15_000 });

/** Records the JS files the page downloads, and which library each one is. */
function watchJs(page) {
  const files = [];
  page.on("response", async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.text().catch(() => "");
    files.push({ url: r.url(), gsap: body.includes("GreenSock"), confetti: body.includes("disableForReducedMotion") });
  });
  return files;
}

// 1. Frame rate.
async function measure(label, q, press) {
  const results = [];
  for (let run = 1; run <= RUNS; run++) {
    const ctx = await browser.newContext(LAPTOP);
    const page = await ctx.newPage();
    await page.goto(lab(q), { waitUntil: "networkidle" });
    await page.waitForTimeout(1500); // GSAP (and confetti) loaded, as on a real screen
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 2 });
    await page.evaluate(() => {
      window.__frames = [];
      window.__longTasks = 0;
      new PerformanceObserver((list) => (window.__longTasks += list.getEntries().length)).observe({ type: "longtask" });
      let last = performance.now();
      const tick = (t) => {
        window.__frames.push([t, t - last]);
        last = t;
        if (window.__frames.length < 1200) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.evaluate((key) => {
      window.__start = performance.now();
      window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }, press);
    if (press === "Enter") await page.getByRole("button", { name: "Ilawan ang parol" }).click();
    await page.waitForFunction(() => document.querySelector(".rv-stage")?.hasAttribute("data-animating"), null, { timeout: 5_000 });
    await idle(page);
    const { frames, longTasks, ms } = await page.evaluate(() => {
      const end = performance.now();
      return {
        frames: window.__frames.filter(([t]) => t > window.__start && t < end).map(([, d]) => d),
        longTasks: window.__longTasks,
        ms: end - window.__start,
      };
    });
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const sorted = [...frames].sort((a, b) => a - b);
    results.push(
      `  run ${run}: ${(1000 / avg).toFixed(1)} fps avg over ${(ms / 1000).toFixed(1)}s, p95 ${sorted[Math.floor(frames.length * 0.95)].toFixed(1)}ms, ` +
        `worst ${sorted.at(-1).toFixed(1)}ms, frames over 34ms: ${frames.filter((d) => d > 34).length}/${frames.length}, long tasks: ${longTasks}`,
    );
    await ctx.close();
  }
  console.log(`${label}, 2x CPU throttling, 1920×1080 (${RUNS} runs):\n${results.join("\n")}`);
}

await measure("Next, 12 members (flip + bulbs)", "n=12&step=6", "ArrowRight");
await measure("Next, 30 members (window turns + flip + bulbs)", "n=30&step=15", "ArrowRight");
await measure("Previous, 30 members", "n=30&step=15", "ArrowLeft");
// The finale is a button press: "Enter" here means "click Ilawan ang parol".
await measure("Finale, 12 members (sweep, haloes, glow, stars)", "n=12&step=12", "Enter");

// 2. Lazy loading.
{
  const ctx = await browser.newContext(LAPTOP);
  const page = await ctx.newPage();
  const js = watchJs(page);
  const res = await page.goto(lab("n=12&step=6"), { waitUntil: "networkidle" });
  const html = await res.text();
  const own = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const gsapFile = js.find((f) => f.gsap);
  const inPageScripts = gsapFile ? own.some((src) => gsapFile.url.endsWith(src)) : false;
  const confettiEarly = js.some((f) => f.confetti);
  await page.goto(lab("n=12&step=12"), { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const confettiOnLast = js.some((f) => f.confetti);
  console.log(
    `Lazy: GSAP ${gsapFile ? (inPageScripts ? "IN THE PAGE'S OWN SCRIPTS (bad)" : "fetched after the page is up") : "NOT LOADED (bad)"}; ` +
      `confetti before the last pair: ${confettiEarly ? "LOADED (bad)" : "no"}, on the last pair: ${confettiOnLast ? "loaded" : "NOT LOADED (bad)"}`,
  );
  await ctx.close();
}

// 3. Reduced motion.
{
  const ctx = await browser.newContext({ ...LAPTOP, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const js = watchJs(page);
  await page.goto(lab("n=30&step=29"), { waitUntil: "networkidle" });
  await page.keyboard.press("ArrowRight");
  await idle(page);
  const flip = await page.locator('[data-slip="29"] [data-part="flip"]').evaluate((el) => getComputedStyle(el).transform);
  await page.getByRole("button", { name: "Ilawan ang parol" }).click();
  await idle(page);
  const last = await page.locator(".rv-stage").getAttribute("data-last-transition");
  console.log(
    `Reduced motion: GSAP ${js.some((f) => f.gsap) ? "LOADED (bad)" : "not loaded"}, confetti ${js.some((f) => f.confetti) ? "LOADED (bad)" : "not loaded"}, ` +
      `no 3D flip: ${flip === "none"}, finale played: ${last === "finale"}`,
  );
  await ctx.close();
}

// 4. Every transition ends exactly on the fresh-load state.
async function ringState(page) {
  return page.locator(".rv-stage").evaluate((stage) =>
    [...stage.querySelectorAll("*")]
      .map((el) => {
        const cs = getComputedStyle(el);
        const data = [...el.attributes]
          .filter((a) => a.name.startsWith("data-") && !["data-transitions", "data-last-transition", "data-animating"].includes(a.name))
          .map((a) => `${a.name}=${a.value}`)
          .join(",");
        const t = cs.transform === "none" ? "none" : cs.transform.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (x) => (+x).toFixed(1));
        return `${el.className}[${data}] ${(+cs.opacity).toFixed(2)} ${t} ${el.children.length ? "" : el.textContent}`;
      })
      .join("\n"),
  );
}
{
  const cases = [
    ["12 start", 12, 0, "start"],
    ["12 next", 12, 6, "next"],
    ["12 previous", 12, 7, "previous"],
    ["30 next", 30, 15, "next"],
    ["30 previous", 30, 15, "previous"],
    ["12 finale", 12, 12, "finale"],
    ["30 finale", 30, 30, "finale"],
  ];
  const out = [];
  for (const reduced of [false, true]) {
    for (const [label, n, step, kind] of cases) {
      const ctx = await browser.newContext({ ...LAPTOP, reducedMotion: reduced ? "reduce" : "no-preference" });
      const page = await ctx.newPage();
      await page.goto(lab(`n=${n}&step=${step}`), { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      if (kind === "start") await page.getByRole("button", { name: "Start the reveal" }).click();
      else if (kind === "finale") await page.getByRole("button", { name: "Ilawan ang parol" }).click();
      else await page.keyboard.press(kind === "next" ? "ArrowRight" : "ArrowLeft");
      await page.waitForTimeout(100);
      await idle(page);
      const after = await ringState(page);
      const to = kind === "previous" ? step - 1 : step + 1;
      await page.goto(lab(`n=${n}&step=${to}`), { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      out.push(`${label}${reduced ? " (reduced)" : ""}: ${after === (await ringState(page)) ? "same" : "DIFFERENT (bad)"}`);
      await ctx.close();
    }
  }
  console.log(`After each transition vs a fresh load of that step:\n  ${out.join("\n  ")}`);
}

// 5. noindex.
const res = await fetch(lab("n=12"));
console.log(`Lab robots: X-Robots-Tag "${res.headers.get("x-robots-tag")}"`);

await browser.close();
