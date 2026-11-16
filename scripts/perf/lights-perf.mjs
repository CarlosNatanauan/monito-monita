// The decorative light string (docs/DESIGN.md, "Light string"):
//   1. each controller mode on the landing and /me: frame rate at 4x CPU
//      throttling (Pixel 7), how many animations run and on what property
//   2. flash rate per mode: each lit layer sampled every 20ms for 8s;
//      a flash is an off-and-back-on (opacity under 0.5, then over)
//   3. never dark: per mode, the longest stretch with every group off and
//      the brightest group at the darkest moment; "off" still glows
//   4. the controller: a "Palitan ang ilaw" button, tap to switch; hidden =
//      steady and lit; a missed "visible again" event still resumes
//   5. the first paint with JavaScript off is steady and lit, and the 8s
//      auto cycle starts by itself (also after loading hidden), on WebKit
//      (iPhone 14) and Chromium (Pixel 7)
//   6. forms (/new): calm twinkle only, not a button
//   7. reduced motion: no button, no animations, every bulb lit, a tap does nothing
//
// Creates an "E2E Lights perf" group in the dev DB for /me (the e2e
// teardown deletes E2E groups). Run against a PRODUCTION build:
//   npm run build && npx next start -p 3100
//   node scripts/perf/lights-perf.mjs http://localhost:3100
import { chromium, devices, webkit } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const MODES = ["steady", "alternate", "chase", "fade", "twinkle"];
const ENGINES = [
  ["iPhone 14 (WebKit)", "webkit", "iPhone 14"],
  ["Pixel 7 (Chromium)", "chromium", "Pixel 7"],
];
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

/** Each lit layer's opacity right now. */
const litOpacities = (page) =>
  page.evaluate(() => [...document.querySelectorAll("[data-light-string] .ls-lit")].map((el) => +(+getComputedStyle(el).opacity).toFixed(2)));

/**
 * Each lit layer's opacity every 20ms for `ms`: flashes per second (worst
 * layer and whole string), the lowest opacity of any layer, the brightest
 * layer at the string's darkest moment, and the longest stretch with every
 * group under 0.5 (the whole string looking off).
 */
const flashRate = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const layers = [...document.querySelectorAll("[data-light-string] .ls-lit")];
        const off = layers.map(() => false);
        const flashes = layers.map(() => 0);
        let min = 1;
        let brightestAtDarkest = 1;
        let darkSince = null;
        let darkMs = 0;
        const start = performance.now();
        const id = setInterval(() => {
          const now = performance.now();
          const os = layers.map((el) => +getComputedStyle(el).opacity);
          os.forEach((o, i) => {
            min = Math.min(min, o);
            if (!off[i] && o < 0.5) off[i] = true;
            else if (off[i] && o > 0.5) {
              off[i] = false;
              flashes[i]++;
            }
          });
          const top = Math.max(...os);
          brightestAtDarkest = Math.min(brightestAtDarkest, top);
          if (top < 0.5) {
            darkSince ??= now;
            darkMs = Math.max(darkMs, now - darkSince);
          } else darkSince = null;
          if (now - start > ms) {
            clearInterval(id);
            const s = ms / 1000;
            resolve({ worst: Math.max(...flashes) / s, all: flashes.reduce((a, b) => a + b, 0) / s, min, brightestAtDarkest, darkMs });
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
        `over 34ms ${f.over}/${f.n}, long tasks ${f.long}; flashes/s: worst bulb ${fl.worst.toFixed(2)}, whole string ${fl.all.toFixed(2)}; lowest layer ${fl.min.toFixed(2)}, brightest at the darkest moment ${fl.brightestAtDarkest.toFixed(2)}, all off for ${Math.round(fl.darkMs)}ms`,
    );
    check(mode === MODES[m] && still, `tap ${m} → ${MODES[m]}, held for the whole sample`);
    check(anims.length === (m === 0 ? 0 : 4) && anims.every((a) => a.props.join() === "opacity"), `${MODES[m]}: ${m === 0 ? "no" : "4 opacity-only"} animations`);
    check(f.fps > 58 && f.over === 0, `${MODES[m]}: 60 fps at 4x`);
    check(fl.worst <= 1.2 && fl.all <= 3, `${MODES[m]}: at most ~1 flash/s per bulb, under 3/s on the whole string`);
    // Never dark: some bulbs always lit (alternate, chase), the fade's bottom
    // still glowing, twinkle's rare all-dim moments brief; off still glows.
    const dark = { steady: fl.min === 1, alternate: fl.darkMs <= 100, chase: fl.darkMs <= 100, fade: fl.brightestAtDarkest >= 0.29, twinkle: fl.darkMs <= 300 };
    check(dark[MODES[m]] && fl.min >= 0.14, `${MODES[m]}: never dark (off glows at ${fl.min.toFixed(2)})`);
  }

  // Hidden: steady and lit (no animation frozen mid-pattern). Then the
  // "visible again" event never comes (bfcache restores, in-app browsers):
  // the string must notice by itself and carry on.
  await button.click(); // twinkle -> steady
  for (let k = 0; k < 3; k++) await button.click(); // -> fade
  await page.waitForTimeout(2300); // near the bottom of the fade
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  const hiddenLit = await litOpacities(page);
  check(
    (await string.getAttribute("data-paused")) !== null && (await stringAnimations(page)).length === 0 && hiddenLit.every((o) => o === 1),
    `hidden: no animations, every bulb lit (${hiddenLit.join(", ")})`,
  );
  await page.evaluate(() => delete document.visibilityState); // visible again, no event
  await page.waitForTimeout(1500);
  check((await string.getAttribute("data-paused")) === null, "visible again without an event: resumes within 1.5s");
  const resumedMode = await string.getAttribute("data-mode");
  await page.waitForTimeout(8200);
  const nextMode = await string.getAttribute("data-mode");
  check(nextMode !== resumedMode, `and the 8s cycle carries on (${resumedMode} -> ${nextMode})`);
  await ctx.close();
}

// First paint, before any JavaScript: steady and lit.
{
  console.log("First paint (JavaScript off):");
  for (const [name, engine, dev] of ENGINES) {
    const b = engine === "chromium" ? browser : await webkit.launch();
    const ctx = await b.newContext({ ...devices[dev], javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "load" });
    const lit = await litOpacities(page);
    const mode = await page.locator("[data-light-string]").getAttribute("data-mode");
    check(mode === "steady" && lit.every((o) => o === 1), `${name}: steady, every bulb lit (${lit.join(", ")})`);
    await ctx.close();
    if (b !== browser) await b.close();
  }
}

// The auto cycle starts by itself: steady, then alternate 8s after load,
// no tap. Also when the page loads hidden (opened in the background) and
// is shown later without any event.
{
  console.log("Auto cycle (no tap):");
  for (const [name, engine, dev] of ENGINES) {
    const b = engine === "chromium" ? browser : await webkit.launch();
    const ctx = await b.newContext({ ...devices[dev] });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    const string = page.locator("[data-light-string]");
    await page.waitForTimeout(6500);
    const early = await string.getAttribute("data-mode");
    await page.waitForTimeout(3500);
    const later = await string.getAttribute("data-mode");
    check(early === "steady" && later === "alternate", `${name}: steady at ~7s, alternate at ~10s (got ${early}, ${later})`);

    const bg = await b.newContext({ ...devices[dev] });
    await bg.addInitScript(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      setTimeout(() => delete document.visibilityState, 3000); // shown 3s later, no event
    });
    const hiddenPage = await bg.newPage();
    await hiddenPage.goto(base, { waitUntil: "networkidle" });
    const hs = hiddenPage.locator("[data-light-string]");
    const pausedAtLoad = await hs.getAttribute("data-paused");
    const litAtLoad = await litOpacities(hiddenPage);
    await hiddenPage.waitForTimeout(13000);
    const pausedLater = await hs.getAttribute("data-paused");
    const modeLater = await hs.getAttribute("data-mode");
    check(
      pausedAtLoad !== null && litAtLoad.every((o) => o === 1) && pausedLater === null && modeLater === "alternate",
      `${name}: loaded hidden: lit while hidden, then cycling once shown (mode ${modeLater})`,
    );
    await ctx.close();
    await bg.close();
    if (b !== browser) await b.close();
  }
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
