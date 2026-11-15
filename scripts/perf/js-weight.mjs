// JS transferred (compressed) on the join page and on /me, first load on a
// Pixel 7. docs/DESIGN.md's budget: under 150 KB on both.
// Creates an "E2E JS weight" group in the DEV database (the e2e global
// teardown deletes E2E groups). Run against a PRODUCTION build:
//   npm run build && npx next start -p 3100
//   node scripts/perf/js-weight.mjs http://localhost:3100   (VERBOSE=1 lists each file)
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";

/** Loads `url` in a fresh browser (no shared cache) and sums the JS bytes on the wire. */
async function measure(url, label, cookies = []) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
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
const org = await setup.newContext({ ...devices["Pixel 7"] });
const p = await org.newPage();
await p.goto(`${base}/new`);
await p.getByLabel("Pangalan ng group").fill("E2E JS weight");
await p.getByLabel("Petsa ng party").fill("2026-12-24");
await p.getByLabel("Budget", { exact: true }).fill("500");
await p.getByRole("button", { name: "Create group" }).click();
await p.getByRole("heading", { name: "Ready na ang group mo!" }).waitFor();
const shareUrl = `${new URL(base).protocol}//${(await p.locator("p.select-all").first().textContent()).trim()}`;

// A member, to get the /me cookie.
const member = await setup.newContext({ ...devices["Pixel 7"] });
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
