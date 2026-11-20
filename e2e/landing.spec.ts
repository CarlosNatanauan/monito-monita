import { expect, test } from "./test";

/**
 * The landing, direction 1a "Poster first" (docs/design/landing-video,
 * docs/DESIGN.md "Landing video"):
 * - the poster and "Create your group" are fully visible at the fold
 *   targets (laptop 1366×657, phone 390×664);
 * - first paint is the poster only (our own WebP, eager, high priority):
 *   no <video> element and no video request before the press;
 * - the poster is one labelled button that works from the keyboard, with
 *   the gold focus ring;
 * - pressing it plays the self-hosted MP4 in place on a laptop (same box,
 *   nothing moves) or full screen on a phone; leaving full screen, or the
 *   end of the video, brings the poster and the focus back;
 * - one "landing video played" per press; no layout shift; the footer.
 *
 * Media playback itself (codecs, the browsers' own full-screen players) is
 * stubbed: the test checks what this page does, not the browser's player.
 */
const VIDEO = /\/landing\/monito-monita-(1080|720)\.mp4/;

test("landing: poster first, the video loads only when played", async ({ page }, info) => {
  const phone = info.project.name !== "laptop-1366";
  // The fold targets: a 1366×768 screen with the browser open, an iPhone in Safari.
  await page.setViewportSize(phone ? { width: 390, height: 664 } : { width: 1366, height: 657 });

  const videoRequests: string[] = [];
  page.on("request", (r) => {
    if (VIDEO.test(r.url()) || /youtube|ytimg|googlevideo/.test(r.url())) videoRequests.push(r.url());
  });
  await page.route(VIDEO, (route) => route.fulfill({ status: 200, contentType: "video/mp4", body: "" }));
  let plays = 0;
  await page.route("**/api/landing-video", (route) => {
    plays++;
    return route.fulfill({ status: 204 });
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __fullscreen: string[]; __lcp: string };
    w.__cls = 0;
    w.__fullscreen = [];
    w.__lcp = "";
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    try {
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1) as unknown as { element?: Element } | undefined;
        if (last?.element) w.__lcp = last.element.tagName + " " + (last.element.getAttribute("src") ?? "");
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* WebKit has no LCP entries */
    }
    // Playback and full screen are the browser's; stub them and record the calls.
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {};
    const proto = HTMLVideoElement.prototype as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    Element.prototype.requestFullscreen = function (this: Element) {
      w.__fullscreen.push("request");
      Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => this });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
    proto.webkitEnterFullscreen = function () {
      w.__fullscreen.push("webkit");
    };
  });

  await page.goto("/");
  const poster = page.getByRole("button", { name: "Panoorin ang demo video, 0:51" });
  const create = page.getByRole("link", { name: "Create your group" });
  await expect(poster).toBeVisible();

  // Above the fold, fully.
  const viewport = page.viewportSize()!;
  for (const [what, el] of [
    ["poster", poster],
    ["Create your group", create],
  ] as const) {
    const b = (await el.boundingBox())!;
    expect(b.y, `${what}: top in view`).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, `${what}: bottom above the ${viewport.height}px fold`).toBeLessThanOrEqual(viewport.height);
  }

  // The poster: our own still, eager, high priority, the page's largest paint.
  const img = poster.locator("img");
  await expect(img).toHaveAttribute("loading", "eager");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).toHaveJSProperty("complete", true);
  expect(await img.evaluate((i: HTMLImageElement) => new URL(i.currentSrc).pathname)).toMatch(/^\/landing\/poster-(640|1280)\.webp$/);
  if (info.project.name !== "iphone-14") {
    await expect.poll(() => page.evaluate(() => (window as unknown as { __lcp: string }).__lcp)).toMatch(/^IMG \/landing\/poster-/);
  }
  await page.waitForTimeout(500);
  await expect(page.locator("video")).toHaveCount(0);
  expect(videoRequests, "no video request before the press").toEqual([]);

  // Keyboard: Tab from the wordmark reaches the poster, with the gold focus ring.
  const box = page.locator("div.aspect-video").filter({ has: poster });
  const before = await box.boundingBox();
  await page.getByRole("link", { name: "Monito Monita" }).focus();
  await page.keyboard.press("Tab");
  await expect(poster).toBeFocused();
  expect(await poster.evaluate((el) => getComputedStyle(el).outlineColor)).toBe("rgb(244, 197, 66)");
  await page.keyboard.press("Enter");

  const video = page.locator("video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("src", phone ? "/landing/monito-monita-720.mp4" : "/landing/monito-monita-1080.mp4");
  await expect(video).toHaveAttribute("controls", "");
  await expect.poll(() => plays, { message: "one play counted" }).toBe(1);
  expect(videoRequests.every((u) => VIDEO.test(u))).toBe(true);
  // In place, in the poster's box: nothing else moves.
  const playing = (await video.boundingBox())!;
  for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(playing[k] - before![k])).toBeLessThan(1);

  if (phone) {
    // Full screen on a phone (requestFullscreen, or iOS's own player); leaving it brings the poster back.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __fullscreen: string[] }).__fullscreen.length)).toBeGreaterThan(0);
    const how = await page.evaluate(() => (window as unknown as { __fullscreen: string[] }).__fullscreen[0]);
    await page.evaluate((how) => {
      const v = document.querySelector("video")!;
      if (how === "request") {
        Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => null });
        document.dispatchEvent(new Event("fullscreenchange"));
      } else v.dispatchEvent(new Event("webkitendfullscreen"));
    }, how);
  } else {
    // The end of the video brings the poster back.
    await video.evaluate((v) => v.dispatchEvent(new Event("ended")));
  }
  await expect(page.locator("video")).toHaveCount(0);
  await expect(poster).toBeVisible();
  await expect(poster).toBeFocused();

  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls), "no layout shift").toBeLessThan(0.01);

  // The footer, landing only.
  const footer = page.locator("footer");
  await expect(footer).toContainText("Made by Carlos Natanauan");
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/CarlosNatanauan/monito-monita");
  await expect(footer.getByRole("link", { name: "kuyacarlos.is-a.dev" })).toHaveAttribute("href", "https://kuyacarlos.is-a.dev");
  await page.screenshot({ path: `e2e/screenshots/landing-poster-${info.project.name}.png` });

  await page.goto("/new");
  await expect(page.locator("footer")).toHaveCount(0);
});

test("landing: the small bowl's code loads only on the bowl, and a tap before it arrives still plays", async ({ page }) => {
  // The scripts the page itself names; anything else asked for later (the bowl's lazy chunks) is held back 1.5 s.
  const html = await (await page.request.get("/")).text();
  const own = new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"' ]+?\.js/g)].map((m) => m[0]));
  const lazy: { url: string; at: number }[] = [];
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    // (next dev also loads its hot-reload client late; that isn't the page's code.)
    if (!own.has(path) && !/hmr-client/.test(path)) {
      lazy.push({ url: path, at: Date.now() });
      await new Promise((r) => setTimeout(r, 1500));
    }
    await route.continue();
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // A real button on the "Paano 'to?" list from first paint, its bowl on the list's top-right corner.
  const bowl = page.getByRole("button", { name: "Bumunot ka: sample na bunutan" });
  const list = page.getByRole("region", { name: "Paano 'to?" });
  await bowl.scrollIntoViewIfNeeded();
  const [b, l] = [(await bowl.boundingBox())!, (await list.boundingBox())!];
  expect(b.x + b.width, "the bowl overhangs the list's right edge").toBeGreaterThan(l.x + l.width);
  expect(b.y, "the bowl overhangs the list's top").toBeLessThan(l.y);
  expect(b.y + b.height, "and sits on the title row").toBeLessThanOrEqual(l.y + 42);
  // Neither idle time nor scrolling to the bowl loads its code.
  await page.waitForTimeout(2500);
  expect(lazy, "nothing of the bowl's loads without touching it").toEqual([]);

  // The tap lands while its code is still on the way: it waits, then plays.
  await bowl.click();
  await expect.poll(() => lazy.length, { message: "the code is asked for on the tap" }).toBeGreaterThan(0);
  const slip = page.locator("[data-sample-slip]");
  await expect(slip).toHaveAttribute("data-sample-slip", "Ate Joy", { timeout: 20_000 });
  await expect(page.locator('[data-bunutan][data-phase="shown"]')).toHaveCount(1, { timeout: 20_000 });

  // The opened slip covers no text: not the list's lines, nor anything above it.
  const s = (await slip.locator('[data-part="riser"]').boundingBox())!;
  const covered = await page.evaluate(
    ({ x, y, width, height }) => {
      const hit: string[] = [];
      const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement!;
        if (!n.textContent?.trim() || el.closest("[data-bunutan] button, [data-sample-slip], .sr-only")) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) {
          if (r.right > x && r.left < x + width && r.bottom > y && r.top < y + height) hit.push(n.textContent.trim());
        }
      }
      return hit;
    },
    { x: s.x, y: s.y, width: s.width, height: s.height },
  );
  expect(covered, "text under the opened slip").toEqual([]);
});
