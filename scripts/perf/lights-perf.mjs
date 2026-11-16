// The decorative light string (docs/DESIGN.md, "Light string"):
//   1. each controller mode on the landing and /me: frame rate at 4x CPU
//      throttling (Pixel 7), how many animations run and on what property
//   2. flash rate per mode: each lit layer sampled every 20ms for 8s;
//      a flash is an off-and-back-on (opacity under 0.5, then over)
//   3. the controller: a "Palitan ang ilaw" button, the 8s auto cycle,
//      tap to switch, paused while the tab is hidden
//   4. forms (/new): calm twinkle only, not a button
//   5. reduced motion: no button, no animations, every bulb lit, a tap does nothing
//
// Creates an "E2E Lights perf" group in the dev DB for /me (the e2e
// teardown deletes E2E groups). Run against a PRODUCTION build:
//   npm run build && npx next start -p 3100
//   node scripts/perf/lights-perf.mjs http://localhost:3100
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const MODES = ["steady", "alternate", "chase", "fade", "twinkle"];
const browser = await chromium.launch();
let failures = 0;
const check = (ok, text) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${text}`);
};

// A member, for /me.
const org = await browser.newContext({ ...devices["Pixel 7"] });
const p = await org.newPage();
await p.goto(`${base}/new`);
await p.getByLabel("Pangalan ng group").fill("E2E Lights perf");
await p.getByLabel("Petsa ng party").fill("2026-12-24");
await p.getByLabel("Budget", { exact: true }).fill("500");
await p.getByRole("button", { name: "Create group" }).click();
await p.getByRole("heading", { name: "Ready na ang group mo!" }).waitFor();
const shareUrl = `${new URL(base).protocol}//${(await p.locator("p.select-all").first().textContent()).trim()}`;
const member = await browser.newContext({ ...devices["Pixel 7"] });
const j = await member.newPage();
await j.goto(shareUrl);
await j.getByLabel("Pangalan mo").fill("Joy");
await j.locator("#pin").fill("1234");
await j.getByRole("button", { name: "Join the group" }).click();
await j.waitForURL(/\/me/, { timeout: 20_000 });
const meCookies = await member.cookies();
await org.close();
await member.close();

/** The string's running animations: [layer group, properties]. */
const stringAnimations = (page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.target?.closest?.("[data-light-string]") && a.playState === "running")
      .map((a) => ({
        group: a.effect.target.getAttribute("data-group"),
        props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter(
          (k) => !["offset", "easing", "composite", "computedOffset"].includes(k),
        ),
      })),
  );

/** Each lit layer's opacity every 20ms for `ms`: flashes per second, worst layer and whole string. */
const flashRate = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const layers = [...document.querySelectorAll("[data-light-string] .ls-lit")];
        const off = layers.map(() => false);
        const flashes = layers.map(() => 0);
        let min = 1;
        const start = performance.now();
        const id = setInterval(() => {
          layers.forEach((el, i) => {
            const o = +getComputedStyle(el).opacity;
            min = Math.min(min, o);
            if (!off[i] && o < 0.5) off[i] = true;
            else if (off[i] && o > 0.5) {
              off[i] = false;
              flashes[i]++;
            }
          });
          if (performance.now() - start > ms) {
            clearInterval(id);
            const s = ms / 1000;
            resolve({ worst: Math.max(...flashes) / s, all: flashes.reduce((a, b) => a + b, 0) / s, min });
          }
        }, 20);
      }),
    ms,
  );

/** Frame times for `ms` at 4x CPU throttling. */
async function frames(page, ms) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const r = await page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const out = [];
        let long = 0;
        new PerformanceObserver((l) => (long += l.getEntries().length)).observe({ type: "longtask" });
        let last = performance.now();
        const start = last;
        const tick = (t) => {
          out.push(t - last);
          last = t;
          if (t - start < ms) requestAnimationFrame(tick);
          else resolve({ f: out.slice(1), long });
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.detach();
  const avg = r.f.reduce((a, b) => a + b, 0) / r.f.length;
  const worst = Math.max(...r.f);
  return { fps: 1000 / avg, worst, over: r.f.filter((d) => d > 34).length, n: r.f.length, long: r.long };
}

for (const [label, url, cookies] of [
  ["Landing", base, []],
  ["/me", `${shareUrl}/me`, meCookies],
]) {
  console.log(`${label} (Pixel 7):`);
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: "Palitan ang ilaw" });
  const string = page.locator("[data-light-string]");
  check((await button.count()) === 1, `one "Palitan ang ilaw" button`);
  check((await string.getAttribute("data-mode")) === "steady", "starts steady");

  // Pass 1: flashes (6.5s per mode, inside its 8s), animations, tap order.
  // Each mode is measured right after a tap, so the 8s auto cycle never
  // moves on mid-sample; steady too (a full round of taps lands on it again).
  const results = [];
  for (let m = 0; m < MODES.length; m++) {
    if (m === 0) for (let k = 0; k < MODES.length; k++) await button.click();
    else await button.click();
    const mode = await string.getAttribute("data-mode");
    await page.waitForTimeout(200);
    const anims = await stringAnimations(page);
    const fl = await flashRate(page, 6500);
    results.push({ mode, anims, fl, still: (await string.getAttribute("data-mode")) === mode });
  }
  // Pass 2: frame rate, 4s per mode at 4x throttling.
  await button.click(); // back to steady
  for (let m = 0; m < MODES.length; m++) {
    if (m > 0) await button.click();
    await page.waitForTimeout(200);
    const { mode, anims, fl, still } = results[m];
    const f = await frames(page, 4000);
    const props = [...new Set(anims.flatMap((a) => a.props))].join(",") || "none";
    console.log(
      `  ${mode.padEnd(9)} ${anims.length} animations (${props}); ${f.fps.toFixed(1)} fps at 4x, worst ${f.worst.toFixed(1)}ms, ` +
        `over 34ms ${f.over}/${f.n}, long tasks ${f.long}; flashes/s: worst bulb ${fl.worst.toFixed(2)}, whole string ${fl.all.toFixed(2)}, lowest opacity ${fl.min.toFixed(2)}`,
    );
    check(mode === MODES[m] && still, `tap ${m} → ${MODES[m]}, held for the whole sample`);
    check(anims.length === (m === 0 ? 0 : 4) && anims.every((a) => a.props.join() === "opacity"), `${MODES[m]}: ${m === 0 ? "no" : "4 opacity-only"} animations`);
    check(f.fps > 58 && f.over === 0, `${MODES[m]}: 60 fps at 4x`);
    check(fl.worst <= 1.2 && fl.all <= 3, `${MODES[m]}: at most ~1 flash/s per bulb, under 3/s on the whole string`);
  }

  // Hidden tab: paused, and the auto cycle stops.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  const paused = await page.evaluate(() =>
    document.getAnimations().filter((a) => a.effect?.target?.closest?.("[data-light-string]")).every((a) => a.playState === "paused"),
  );
  check((await string.getAttribute("data-paused")) !== null && paused, "hidden tab: every animation paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await ctx.close();
}

// The auto cycle: steady, then alternate after 8 seconds.
{
  console.log("Auto cycle:");
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  const string = page.locator("[data-light-string]");
  await page.waitForTimeout(7000);
  const early = await string.getAttribute("data-mode");
  await page.waitForTimeout(2000);
  const later = await string.getAttribute("data-mode");
  check(early === "steady" && later === "alternate", `steady at 7s, alternate at 9s (got ${early}, ${later})`);
  await ctx.close();
}

// Forms: calm only, decoration (not a button).
{
  console.log("Forms (/new):");
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(`${base}/new`, { waitUntil: "networkidle" });
  const anims = await stringAnimations(page);
  const fl = await flashRate(page, 6000);
  const f = await frames(page, 3000);
  check((await page.getByRole("button", { name: "Palitan ang ilaw" }).count()) === 0, "no controller button");
  check((await page.locator("[data-light-string]").getAttribute("data-mode")) === "calm", "calm twinkle");
  check(anims.length === 4 && fl.min >= 0.5 && fl.all === 0, `4 opacity animations, never off (lowest opacity ${fl.min.toFixed(2)})`);
  check(f.fps > 58 && f.over === 0, `${f.fps.toFixed(1)} fps at 4x`);
  await ctx.close();
}

// Reduced motion.
{
  console.log("Reduced motion (landing):");
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  const string = page.locator("[data-light-string]");
  await string.click({ force: true });
  await page.waitForTimeout(300);
  const lit = await page.evaluate(() => [...document.querySelectorAll("[data-light-string] .ls-lit")].map((el) => getComputedStyle(el).opacity));
  check((await page.getByRole("button", { name: "Palitan ang ilaw" }).count()) === 0, "not a button");
  check((await stringAnimations(page)).length === 0, "no animations");
  check((await string.getAttribute("data-mode")) === "steady" && lit.every((o) => o === "1"), `steady and lit after a tap (${lit.join(", ")})`);
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} check(s) FAILED` : "All light string checks passed.");
process.exit(failures ? 1 : 0);
