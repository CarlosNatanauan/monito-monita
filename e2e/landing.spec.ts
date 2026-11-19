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
