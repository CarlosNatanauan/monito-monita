/**
 * Signature moments 1 and 2 with reduced motion: the landing's small bowl
 * shows the sample slip already open (a 150ms cross-fade, no GSAP), and the
 * join drop shows the slip in the bowl, then /me (no GSAP). Runs on both phones, against the dev database;
 * the test group is deleted afterwards.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./test";
import { addDays, todayIn } from "../lib/theme-weeks";
import { closeDb } from "../server/db";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { readLink } from "./flow";
import { readMyLink } from "./links";

const createdSlugs: string[] = [];
test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

test.use({ reducedMotion: "reduce", locale: "en-PH", timezoneId: "Asia/Manila" });

/** Records whether the page downloads GSAP. */
function watchForGsap(page: Page) {
  const seen = { gsap: false };
  page.on("response", async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.text().catch(() => "");
    if (body.includes("GreenSock")) seen.gsap = true;
  });
  return seen;
}

test("reduced motion: landing slip and join drop without GSAP", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const seen = watchForGsap(page);

  await test.step("landing: tapping the bowl shows the open sample slip", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Bumunot ka: sample na bunutan" }).click();
    const sample = page.locator("[data-sample-slip]");
    await expect(sample).toHaveAttribute("data-sample-slip", "Ate Joy");
    // Straight to the open slip: the name is on it, no unfold to wait for.
    await expect(page.getByRole("button", { name: "Bumunot ulit: sample na bunutan" })).toBeVisible();
    await expect(sample.locator('[data-part="riser"] [data-part="flat"]')).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Bumunot ulit: sample na bunutan" }).click();
    await expect(sample).not.toHaveAttribute("data-sample-slip", "Ate Joy");
    // The cross-fade ends with one slip.
    await expect(sample.locator('[data-part="riser-old"]')).toHaveCount(0);
    await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-reduced-landing.png` });
  });

  let shareUrl = "";
  await test.step("create a group", async () => {
    await page.getByRole("link", { name: "Create your group" }).click();
    await page.getByLabel("Pangalan ng group").fill(`${E2E_PREFIX}Reduced (${testInfo.project.name})`);
    await page.getByLabel("Budget", { exact: true }).fill("300");
    await page.getByLabel("Petsa ng party").fill(addDays(todayIn("Asia/Manila"), 30));
    await page.getByRole("button", { name: "Create group" }).click();
    shareUrl = await readLink(page, /\/g\/[a-z0-9]+$/);
    createdSlugs.push(new URL(shareUrl).pathname.split("/")[2]);
  });

  await test.step("join: the slip is shown in the bowl, then /me with the masked link", async () => {
    await page.goto(shareUrl);
    await page.getByLabel("Pangalan mo").fill("Lola Nena");
    await page.getByLabel("4-digit PIN").fill("2468");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.locator("[data-join-drop]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hi, Lola Nena!" })).toBeVisible();
    await readMyLink(page);
  });

  expect(seen.gsap, "GSAP was downloaded with reduced motion").toBe(false);
  expect(errors).toEqual([]);
});
