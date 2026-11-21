// JS transferred (compressed) on the join page and on /me, first load on a
// Pixel 7. docs/DESIGN.md's budget: under 150 KB on both.
// Creates an "E2E JS weight" group in the DEV database (the e2e global
// teardown deletes E2E groups). Run against a PRODUCTION build:
//   npm run build && npx next start -p 3100
//   node scripts/perf/js-weight.mjs http://localhost:3100   (VERBOSE=1 lists each file)
// Only ever talks to `base`: a build made with NEXT_PUBLIC_SITE_URL shows the
// live site's address in its share link, so the link's path is kept and its
// host replaced, and any request to another origin is blocked and reported.
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const origin = new URL(base).origin;
const blocked = new Set();

/** A context that can only reach `base`. */
async function localContext(browser) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (/^(data|blob):/.test(url) || new URL(url).origin === origin) return route.fallback();
    blocked.add(new URL(url).origin);
    return route.abort("blockedbyclient");
  });
  return ctx;
}

/** Loads `url` in a fresh browser (no shared cache) and sums the JS bytes on the wire. */
async function measure(url, label, cookies = []) {
  const browser = await chromium.launch();
  const ctx = await localContext(browser);
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const urls = new Map();
  const sizes = new Map();
  cdp.on("Network.responseReceived", (e) => urls.set(e.requestId, e.response.url));
  cdp.on("Network.loadingFinished", (e) => {
    const u = urls.get(e.requestId);
    if (u && /\.js(\?|$)/.test(u)) sizes.set(u, e.encodedDataLength);
  });
  const response = await page.goto(url, { waitUntil: "networkidle" });
  const html = (await response?.text()) ?? "";
  await page.waitForTimeout(1500);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  console.log(`${label}: ${(total / 1024).toFixed(1)} KB JS over ${sizes.size} files`);
  if (process.env.VERBOSE) {
    for (const [u, s] of [...sizes].sort((a, b) => b[1] - a[1])) {
      const file = u.split("/").pop();
      console.log(`   ${(s / 1024).toFixed(1).padStart(6)} KB  ${file}${html.includes(file) ? "" : "  (not in the page's HTML: a prefetch or a lazy chunk)"}`);
    }
  }
  await browser.close();
  return total;
}

// A group to measure, created through the app.
const setup = await chromium.launch();
const org = await localContext(setup);
const p = await org.newPage();
await p.goto(`${base}/new`);
await p.getByLabel("Pangalan ng group").fill("E2E JS weight");
await p.getByLabel("Petsa ng party").fill("2026-12-24");
await p.getByLabel("Budget", { exact: true }).fill("500");
await p.getByRole("button", { name: "Create group" }).click();
await p.getByRole("heading", { name: "Ready na ang group mo!" }).waitFor();
// The link box shows "host/g/slug" (the live host on a build made with
// NEXT_PUBLIC_SITE_URL): keep the path, always on `base`.
const shown = (await p.locator("p.select-all").first().textContent()).trim();
const shareUrl = new URL(shown.slice(shown.indexOf("/")), base).href;

// A member, to get the /me cookie.
const member = await localContext(setup);
const j = await member.newPage();
await j.goto(shareUrl);
await j.getByLabel("Pangalan mo").fill("Joy");
await j.locator("#pin").fill("1234");
await j.getByRole("button", { name: "Join the group" }).click();
await j.waitForURL(/\/me/, { timeout: 20_000 });
const cookies = await member.cookies();
await setup.close();

const budget = 150 * 1024;
const join = await measure(shareUrl, "Join page");
const me = await measure(`${shareUrl}/me`, "/me (before the draw)", cookies);
console.log(join < budget && me < budget ? "Under 150 KB on both." : "OVER the 150 KB budget.");
if (blocked.size) console.log(`Blocked requests to other origins (not measured): ${[...blocked].join(", ")}`);
