import { expect, test } from "./test";

/**
 * The landing (docs/DESIGN.md, "Layout" and "Landing video"): from 600px
 * the hero fills the window; the demo video is a poster from this site
 * until it's played (no request to YouTube before that), its play control
 * is a labelled button that works from the keyboard, playing swaps in the
 * youtube-nocookie player in the same box and counts one play; nothing on
 * the page shifts; the footer links to the repo and the portfolio.
 */
const YOUTUBE = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|youtu\.be|ggpht\.com)$/;

test("landing: full-height hero, the demo video loads YouTube only when played", async ({ page }) => {
  const youtube: string[] = [];
  page.on("request", (r) => {
    if (YOUTUBE.test(new URL(r.url()).hostname)) youtube.push(r.url());
  });
  // Plays are counted by our own route; never sent anywhere from the test.
  let plays = 0;
  await page.route("**/api/landing-video", (route) => {
    plays++;
    return route.fulfill({ status: 204 });
  });
  // The real player isn't needed (or reachable from CI): a stand-in page.
  await page.route(/youtube-nocookie\.com/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>player</title>" }));
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/");
  const viewport = page.viewportSize()!;
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  await expect(hero.getByRole("heading", { name: "Isang link lang para sa buong bunutan." })).toBeVisible();
  if (viewport.width >= 600) {
    const box = (await hero.boundingBox())!;
    expect(box.y + box.height, "the hero reaches the bottom of the window").toBeGreaterThanOrEqual(viewport.height - 1);
  }

  const section = page.locator('section[aria-labelledby="see-how"]');
  await expect(section.getByRole("heading", { name: "See how it works" })).toBeVisible();
  const play = section.getByRole("button", { name: "Panoorin ang demo video, 51 segundo" });
  await play.scrollIntoViewIfNeeded();

  // The poster: our own file, loaded, in a 16:9 box.
  const poster = play.locator("img");
  await expect(poster).toHaveJSProperty("complete", true);
  expect(await poster.evaluate((img: HTMLImageElement) => new URL(img.currentSrc).pathname)).toMatch(/^\/landing\/demo-poster-(640|1280)\.(avif|webp)$/);
  expect(await poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const box = section.locator("div.aspect-video");
  // Positions in the page (focus moving into the player may scroll the window).
  const inPage = (l: typeof box) => l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  });
  const before = await inPage(box);
  expect(Math.abs(before.width / before.height - 16 / 9)).toBeLessThan(0.02);
  await page.waitForTimeout(500);
  expect(youtube, "no request to YouTube before play").toEqual([]);

  // Keyboard: Tab from the demo link reaches the play button, with the gold focus ring.
  await page.getByRole("link", { name: "Subukan ang demo" }).focus();
  await page.keyboard.press("Tab");
  await expect(play).toBeFocused();
  expect(await play.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  expect(await play.evaluate((el) => getComputedStyle(el).outlineColor)).toBe("rgb(244, 197, 66)");

  await page.keyboard.press("Enter");
  const player = section.locator('iframe[title="Monito Monita: the demo video"]');
  await expect(player).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/DBNKbfwfE50?autoplay=1&rel=0&playsinline=1");
  await expect(player).toHaveAttribute("allow", /autoplay/);
  await expect(player).toBeFocused();
  await expect.poll(() => plays, { message: "one play counted" }).toBe(1);
  const after = await inPage(player);
  for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(after[k] - before[k])).toBeLessThan(1);
  expect(youtube.every((url) => new URL(url).hostname === "www.youtube-nocookie.com")).toBe(true);

  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls), "no layout shift").toBeLessThan(0.01);

  // The footer, landing only.
  const footer = page.locator("footer");
  await expect(footer).toContainText("Made by Carlos Natanauan");
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/CarlosNatanauan/monito-monita");
  await expect(footer.getByRole("link", { name: "kuyacarlos.is-a.dev" })).toHaveAttribute("href", "https://kuyacarlos.is-a.dev");
  await page.screenshot({ path: `e2e/screenshots/landing-video-${test.info().project.name}.png`, fullPage: true });

  // Not on other pages.
  await page.goto("/new");
  await expect(page.locator("footer")).toHaveCount(0);
});
