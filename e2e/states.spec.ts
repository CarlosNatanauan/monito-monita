/**
 * The in-between states (docs/DESIGN.md, "In-between states"): loading
 * placeholders, pending buttons, the demo's "Inihahanda" moment, the
 * optimistic wishlist (and its roll-back), offline (banner, waiting
 * actions, recovery), the 404, the expired demo, an old or removed
 * personal link, and the icons, manifest and theme colour.
 *
 * Runs on the phones and the 1366×768 laptop, against `next dev` and the
 * dev database; seeded groups are deleted afterwards. Screenshots in
 * e2e/screenshots/{project}/states/.
 */
import { expect, test } from "./test";
import { closeDb } from "../server/db";
import { deleteWish, listWishlist } from "../server/wishlists";
import { removeMember, reissueMemberLink } from "../server/members";
import { deleteGroups } from "./db-cleanup";
import { screenshotter, holdActions } from "./flow";
import { seedGroup } from "./seed";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

/** Holds every Server Action POST until released (a slow server). */
test("in-between states: loading, pending, optimistic, offline, link states", async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  const shot = screenshotter(testInfo, "states", { overlaps: true });
  const device = testInfo.project.use;
  const tag = testInfo.project.name;
  const group = await seedGroup(
    { name: `States (${tag})`, people: ["Joy", "Marco", "Ben", "Carla"], wishes: { Joy: [{ title: "Payong" }] }, draw: true },
    createdSlugs,
  );
  const open = await seedGroup({ name: `States open (${tag})`, people: ["Ana", "Lia"] }, createdSlugs);

  await test.step("loading: the page's own materials, empty, with one line (no JS needed)", async () => {
    const context = await browser.newContext({ ...device, javaScriptEnabled: false });
    const page = await context.newPage();
    const cases: [string, string, string][] = [
      [open.sharePath, "join", "Binubuksan ang listahan ng group."],
      [group.members.Joy.link, "me", "Hinahanap ang slip mo."],
      [group.organizerPath, "admin", "Binibilang ang mga kasali."],
      [`/g/${group.slug}/reveal`, "reveal", "Inaayos ang entablado para sa reveal."],
    ];
    for (const [path, name, line] of cases) {
      await page.goto(path);
      const fallback = page.locator(`[data-loading="${name}"]`);
      await expect(fallback).toBeVisible();
      await expect(fallback.getByRole("status")).toContainText("Sandali lang…");
      await expect(fallback.getByText(line)).toBeVisible();
      await shot(page, `loading-${name}`);
    }
    await context.close();
  });

  await test.step("pending: the join button says what's happening and can't be pressed twice", async () => {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    await page.goto(open.sharePath);
    await page.getByLabel("Pangalan mo").fill("Bea");
    await page.getByLabel("4-digit PIN").fill("1234");
    const hold = await holdActions(page);
    await page.getByRole("button", { name: "Join the group" }).click();
    const pending = page.getByRole("button", { name: "Sumasali…" });
    await expect(pending).toBeDisabled();
    await shot(page, "join-pending");
    expect(hold.held()).toBe(1);
    await hold.release();
    await page.waitForURL(/\/me/, { timeout: 30_000 });
    await context.close();
  });

  await test.step("demo: “Inihahanda ang demo group…” while it's built", async () => {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    await page.goto("/demo");
    const hold = await holdActions(page);
    await page.getByRole("button", { name: "Simulan ang demo" }).click();
    const preparing = page.locator("[data-demo-preparing]");
    await expect(preparing).toBeVisible();
    await expect(preparing.getByRole("status")).toContainText("Inihahanda ang demo group…");
    await expect(page.getByRole("button", { name: "Inihahanda ang demo group…" })).toBeDisabled();
    await shot(page, "demo-preparing");
    await page.unroute("**/*");
    void hold;
    await context.close();
  });

  await test.step("wishlist: optimistic add, then roll back with a clear message", async () => {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    await page.goto(group.members.Joy.link);
    const list = page.getByRole("list", { name: "Wishlist mo" });
    await expect(list.getByText("Payong", { exact: true })).toBeVisible();

    // Add: on the list at once, "Sine-save…" until the server answers.
    const hold = await holdActions(page);
    await page.getByLabel("Ano ang gusto mo?").fill("Libro ni Bob Ong");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(list.getByText("Libro ni Bob Ong", { exact: true })).toBeVisible();
    await expect(list.getByText("Sine-save…")).toBeVisible();
    await expect(page.getByLabel("Ano ang gusto mo?")).toHaveValue("");
    await expect(page.getByLabel("Ano ang gusto mo?")).toBeFocused();
    await shot(page, "wish-saving");
    await hold.release();
    await expect(page.getByRole("button", { name: "Edit Libro ni Bob Ong" })).toBeVisible();
    await expect(page.getByText("Na-save!")).toBeVisible();
    await shot(page, "wish-saved");

    // Delete something the server no longer has: it comes back, with the reason.
    const joyId = group.members.Joy.id;
    const payong = (await listWishlist(joyId)).find((w) => w.title === "Payong")!;
    await deleteWish(joyId, payong.id);
    await page.getByRole("button", { name: "Alisin ang Payong" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Hindi naalis ang “Payong”." })).toBeVisible();
    await expect(list.getByText("Payong", { exact: true })).toBeVisible();
    await shot(page, "wish-rolled-back");
    await context.close();
  });

  await test.step("offline: banner, actions wait, and it recovers by itself", async () => {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    await page.goto(group.members.Marco.link);
    await expect(page.getByRole("heading", { name: /Hi,/ })).toBeVisible();
    await context.setOffline(true);
    const banner = page.locator("[data-offline-banner]");
    await expect(banner).toContainText("Offline ka.");
    // Next sets its offline state in a transition: give it a moment to render
    // before the tap (a tap in the same instant bundles the two updates, so the
    // label would only change once the action settles).
    await page.waitForTimeout(1000);
    await page.getByLabel("Ano ang gusto mo?").fill("Tumbler");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const list = page.getByRole("list", { name: "Wishlist mo" });
    await expect(list.getByText("Tumbler", { exact: true })).toBeVisible();
    await expect(list.getByText("Hinihintay ang signal…")).toBeVisible();
    await shot(page, "offline-waiting");
    await context.setOffline(false);
    await expect(banner).toContainText("Balik na ang signal!");
    await shot(page, "offline-back");
    // The wish went through on its own once the connection returned.
    await expect(page.getByRole("button", { name: "Edit Tumbler" })).toBeVisible({ timeout: 30_000 });
    await expect(banner).toHaveText("", { timeout: 10_000 });
    await context.close();
  });

  await test.step("404, an old personal link, a removed member, an expired demo", async () => {
    const context = await browser.newContext(device);
    const page = await context.newPage();

    await page.goto("/g/zzzzzzzzzzzzzzzzzzzzzz");
    await expect(page.getByRole("heading", { name: "Naligaw ang slip na 'to" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bumalik sa home" })).toHaveAttribute("href", "/");
    await shot(page, "not-found");

    const oldLink = group.members.Carla.link;
    await reissueMemberLink(group.groupId, group.members.Carla.id);
    await page.goto(oldLink);
    await expect(page.getByText("Hindi na gumagana ang link na 'to")).toBeVisible();
    await expect(page.getByRole("link", { name: "Bumalik gamit ang PIN" })).toHaveAttribute("href", `/g/${group.slug}?bumalik=1`);
    await shot(page, "old-link");

    await page.goto(open.members.Lia.link);
    await expect(page.getByRole("heading", { name: /Hi,/ })).toBeVisible();
    await removeMember(open.groupId, open.members.Lia.id);
    await page.reload();
    await expect(page.getByText("Wala ka na sa group na 'to")).toBeVisible();
    await expect(page.getByRole("link", { name: "Bumalik sa home" })).toBeVisible();
    await shot(page, "removed");

    // A group this browser was in, gone (only demos are ever deleted).
    const gone = await seedGroup({ name: `States gone (${tag})`, people: ["Mia"] }, createdSlugs);
    await page.goto(gone.members.Mia.link);
    await expect(page.getByRole("heading", { name: /Hi,/ })).toBeVisible();
    await deleteGroups([gone.slug]);
    for (const path of [`/g/${gone.slug}/me`, `/g/${gone.slug}`, `/g/${gone.slug}/admin`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Tapos na ang demo na 'to" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Simulan ulit ang demo" })).toHaveAttribute("href", "/demo");
    }
    await page.goto(`/g/${gone.slug}/me`);
    await shot(page, "expired-demo");
    await context.close();
  });

  await test.step("icons, manifest and theme colour", async () => {
    const context = await browser.newContext(device);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#3f1f63");
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await (await page.request.get(href!)).json();
    expect(manifest.name).toBe("Monito Monita");
    expect(manifest.theme_color).toBe("#3F1F63");
    for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true);
    await context.close();
  });
});
