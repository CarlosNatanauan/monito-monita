/**
 * The fixes from the persona usability test (Nov 16, 2026), each checked
 * the way the persona ran into it: joining with a taken name or a missing
 * PIN, coming back without "Kuya"/"Tita", the PIN hints, the organizer's
 * tools in a 20-person group (edit details, theme weeks, search, sorted
 * dropdowns, new-link share, removal notice, PIN locks), /me details, and
 * the phone as the reveal remote near party day. Leak checks wherever names
 * or links are shown.
 *
 * Runs on the phones and the 1366×768 laptop, against `next dev` and the
 * dev database; the seeded groups are deleted afterwards.
 */
import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { expect, test } from "./test";
import { addDays, todayIn } from "../lib/theme-weeks";
import { closeDb, db } from "../server/db";
import { members } from "../server/db/schema";
import { deleteGroups } from "./db-cleanup";
import { expectCardOrder, people } from "./flow";
import { capturePage, expectJoinPageClean, expectMemberPageClean, expectOrganizerPageClean, expectRevealPageClean, getTruth, revealOrderOf } from "./leak";
import { seedGroup } from "./seed";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

const WRONG = "Mali ang pangalan o PIN";
const ASK_ORGANIZER = "Nakalimutan ang PIN? I-message ang organizer, bibigyan ka niya ng bagong link.";

/** Records what the page hands to the Web Share API (stubbed, so no sheet opens). */
function stubShare() {
  const w = window as unknown as { __shared: { url?: string; text?: string }[] };
  w.__shared = [];
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async (data: { url?: string; text?: string }) => {
      w.__shared.push(data);
    },
  });
}
const shared = (page: Page) => page.evaluate(() => (window as unknown as { __shared: { url?: string }[] }).__shared);

async function comeBack(page: Page, name: string, pin: string) {
  const form = page.getByRole("form", { name: "Bumalik" });
  await form.getByLabel("Pangalan mo").fill(name);
  await form.getByLabel("4-digit PIN").fill(pin);
  await form.getByRole("button", { name: "Buksan ang slip ko" }).click();
}

test("join and come back: missing PIN, taken name, honorifics, PIN hints (C1–C3, M6)", async ({ browser }, testInfo) => {
  const { problems, newPerson } = people(browser, testInfo);
  const group = await seedGroup(
    { name: `Persona join (${testInfo.project.name})`, people: ["Kuya Ben", "Tita Nena", "Migs", "Carla"] },
    createdSlugs,
  );

  await test.step("M6: no PIN → the error takes the helper's line, Join stays on screen, the PIN box gets focus", async () => {
    const { page } = await newPerson("Migs R.");
    await page.goto(group.sharePath);
    await page.getByLabel("Pangalan mo").fill("Migs R.");
    const join = page.getByRole("button", { name: "Join the group" });
    const before = await join.boundingBox();
    await join.click();
    const form = page.getByRole("form", { name: "Sumali" });
    await expect(form.getByRole("alert")).toHaveText("Pakilagay ang 4-digit PIN.");
    await expect(page.getByText("Tandaan mo 'to", { exact: false })).toHaveCount(0);
    await expect(page.getByLabel("4-digit PIN")).toBeFocused();
    // Same spot: nothing grew above the button.
    expect((await join.boundingBox())!.y).toBeCloseTo(before!.y, 0);
    await expect(join).toBeInViewport({ ratio: 1 });

    // C2: "migs" is taken → two equal choices; "Hindi ako 'yan" keeps the name, with a hint.
    await page.getByLabel("Pangalan mo").fill("migs");
    await page.getByLabel("4-digit PIN").fill("1111");
    await join.click();
    await expect(page.getByRole("heading", { name: "May migs na sa group" })).toBeVisible();
    const mine = page.getByRole("button", { name: "Ako 'yan, ilalagay ko ang PIN" });
    const notMine = page.getByRole("button", { name: "Hindi ako 'yan, gagamit ako ng ibang pangalan" });
    await expect(mine).toBeInViewport({ ratio: 1 });
    await expect(notMine).toBeInViewport({ ratio: 1 });
    // No one else's name, and none from the group at all.
    expectJoinPageClean((await page.content()).replace(/migs/gi, ""), await getTruth(group.slug));
    await notMine.click();
    await expect(page.getByLabel("Pangalan mo")).toHaveValue("migs");
    await expect(page.getByLabel("Pangalan mo")).toBeFocused();
    await expect(page.getByText("May migs na. Lagyan ng initial, hal. “migs R.”")).toBeVisible();
    await page.getByLabel("Pangalan mo").fill("Migs R.");
    await page.getByLabel("4-digit PIN").fill("1111");
    await join.click();
    await page.locator("[data-join-drop]").click();
    await expect(page.getByRole("heading", { name: "Hi, Migs R.!" })).toBeVisible();
  });

  await test.step("C3: coming back as 'Ben' and 'nena' finds Kuya Ben and Tita Nena; the name hint is there", async () => {
    const ben = await newPerson("Ben (new phone)");
    await ben.page.goto(`${group.sharePath}?bumalik=1`);
    await expect(
      ben.page.getByText("Isulat ang pangalan na ginamit mo noong sumali (kasama ang Kuya, Ate, Tita kung meron)."),
    ).toBeVisible();
    await expect(ben.page.getByText(ASK_ORGANIZER)).toBeVisible();
    expectJoinPageClean(await ben.page.content(), await getTruth(group.slug));
    await comeBack(ben.page, "Ben", "1234");
    await expect(ben.page.getByRole("heading", { name: "Hi, Kuya Ben!" })).toBeVisible();

    const nena = await newPerson("Nena (Chrome)");
    await nena.page.goto(`${group.sharePath}?bumalik=1`);
    await comeBack(nena.page, "nena", "1234");
    await expect(nena.page.getByRole("heading", { name: "Hi, Tita Nena!" })).toBeVisible();
  });

  await test.step("C1: wrong PIN keeps the organizer hint under the error; from the 3rd try it grows", async () => {
    const { page } = await newPerson("Carla (guessing)");
    await page.goto(`${group.sharePath}?bumalik=1`);
    await comeBack(page, "Carla", "0000");
    await expect(page.getByRole("form", { name: "Bumalik" }).getByRole("alert")).toHaveText(WRONG);
    await expect(page.getByText(ASK_ORGANIZER)).toBeVisible();
    for (let i = 0; i < 2; i++) {
      await comeBack(page, "Carla", "0000");
      await expect(page.getByRole("form", { name: "Bumalik" }).getByRole("alert")).toHaveText(WRONG);
    }
    await expect(page.getByRole("status").filter({ hasText: "Huminto muna." })).toBeVisible();
    // The same for a name nobody has (nothing about who exists).
    const stranger = await newPerson("stranger");
    await stranger.page.goto(`${group.sharePath}?bumalik=1`);
    for (let i = 0; i < 3; i++) await comeBack(stranger.page, "Walang Ganito", "0000");
    await expect(stranger.page.getByRole("status").filter({ hasText: "Huminto muna." })).toBeVisible();
  });

  expect(problems).toEqual([]);
});

test("create form: weeks that would already be over are tagged and warned about (C4)", async ({ browser }, testInfo) => {
  const { problems, newPerson } = people(browser, testInfo);
  const { page } = await newPerson("HR Joy");
  await page.goto("/new");
  await page.waitForLoadState("networkidle");
  // Party in 10 days with the 4 sample weeks: Week 1 and 2 would be over already.
  await page.getByLabel("Petsa ng party").fill(addDays(todayIn("Asia/Manila"), 10));
  const weeks = page.getByRole("list", { name: "Weekly themes" }).getByRole("listitem");
  await expect(weeks.nth(0)).toContainText("Tapos na");
  await expect(weeks.nth(1)).toContainText("Tapos na");
  await expect(weeks.nth(2)).toContainText("Ngayong linggo");
  await expect(page.locator("[data-past-weeks]")).toContainText("2 themes ang tapos na");
  // Adding a week moves Week 1 earlier: now 3 are over.
  await page.getByRole("button", { name: "+ Magdagdag ng week" }).click();
  await expect(page.locator("[data-past-weeks]")).toContainText("3 themes ang tapos na");
  // A party far enough away: no tags, no warning.
  await page.getByLabel("Petsa ng party").fill(addDays(todayIn("Asia/Manila"), 60));
  await expect(page.locator("[data-past-weeks]")).toHaveCount(0);
  await expect(weeks.first()).not.toContainText(/Tapos na|Ngayong linggo/);
  expect(problems).toEqual([]);
});

/** 20 people, so the list gets "Hanapin" and scrolls in its box on a laptop. Joined in this order (not A to Z). */
const OFFICE = [
  "Joy", "Zed Cruz", "Bong", "Grace", "Rommel", "Yoyo", "Anna", "Nico", "Xian", "Carlo",
  "Mae", "Paolo", "Ella", "Dino", "Ice", "Kaye", "Lito", "Fe", "Hans", "Vince",
];

test("organizer in a 20-person group: themes, edit details, search, pairs, after the draw (C1, C4, C5, C8, M5, M8, M9, M11, M12)", async ({
  browser,
}, testInfo) => {
  const { problems, newPerson } = people(browser, testInfo);
  // Party in 10 days with 4 weeks: weeks 1–2 are over, week 3 is this week.
  const group = await seedGroup({ name: `Persona office (${testInfo.project.name})`, people: OFFICE, partyInDays: 10 }, createdSlugs);
  const joy = await newPerson("HR Joy");
  await joy.context.addInitScript(stubShare);
  const { page } = joy;
  await page.goto(group.organizerPath);
  await expect(page).toHaveURL(new RegExp(`/g/${group.slug}/admin$`));
  const laptop = (page.viewportSize()?.width ?? 0) >= 1024;

  await test.step("M11: the theme list tags this week and dims the weeks that are over", async () => {
    const weeks = page.getByRole("list", { name: "Weekly themes" }).getByRole("listitem");
    await expect(weeks).toHaveCount(4);
    await expect(weeks.nth(0)).toContainText("Tapos na");
    await expect(weeks.nth(1)).toContainText("Tapos na");
    await expect(weeks.nth(2)).toContainText("Ngayong linggo");
    await expect(weeks.nth(2)).toHaveAttribute("aria-current", "date");
    await expect(weeks.nth(3)).not.toContainText(/Tapos na|Ngayong linggo/);
  });

  await test.step("C5 + C4: edit details before the draw, same checks as creating; past weeks are flagged", async () => {
    await page.getByRole("button", { name: "Edit details" }).click();
    const form = page.getByRole("form", { name: "Edit details" });
    await expect(form.getByLabel("Pangalan ng group")).toHaveValue(group.name);
    await expect(form.getByLabel("Budget", { exact: true })).toHaveValue("500");
    await expect(form.getByLabel("Petsa ng party")).toHaveValue(group.partyDate);
    await expect(form.locator("[data-past-weeks]")).toHaveText(
      "2 themes ang tapos na bago pa magsimula, kaya walang makakakita. Bawasan ang weeks para magsimula sa linggong ito.",
    );
    // Same validation as /new.
    await form.getByLabel("Budget", { exact: true }).fill("");
    await form.getByRole("button", { name: "I-save" }).click();
    await expect(form.getByText("Pakilagay ang budget (₱1 pataas).")).toBeVisible();
    await form.getByLabel("Budget", { exact: true }).fill("800");
    await form.getByRole("button", { name: "Remove theme 1" }).click();
    await expect(form.locator("[data-past-weeks]")).toContainText("1 theme ang tapos na");
    await form.getByRole("button", { name: "Remove theme 1" }).click();
    await expect(form.locator("[data-past-weeks]")).toHaveCount(0);
    await form.getByRole("button", { name: "I-save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Na-save ang details." })).toBeVisible();
    await expect(page.getByText("₱800").first()).toBeVisible();
    const weeks = page.getByRole("list", { name: "Weekly themes" }).getByRole("listitem");
    await expect(weeks).toHaveCount(2);
    await expect(weeks.nth(0)).toContainText("Something red");
    await expect(weeks.nth(0)).toContainText("Ngayong linggo");
  });

  await test.step("C8: 'Hanapin' over the list, A–Z dropdowns, a scroll cue on the laptop", async () => {
    const list = page.getByRole("list", { name: "Members" });
    await expect(list.getByRole("listitem")).toHaveCount(20);
    const search = page.getByRole("searchbox", { name: "Hanapin ang member" });
    await expect(search).toHaveAttribute("placeholder", "Hanapin (20)");
    await search.fill("zed");
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText("Zed Cruz");
    await search.fill("walang ganito");
    await expect(page.getByText("Walang member na “walang ganito”.")).toBeVisible();
    await search.fill("");
    await expect(list.getByRole("listitem")).toHaveCount(20);

    const options = (await page.getByLabel("Unang tao").locator("option").allTextContents()).slice(1);
    expect(options).toEqual([...OFFICE].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));

    const cue = page.locator("[data-scroll-cue]");
    if (laptop) {
      await expect(cue).toHaveText("Scroll para sa lahat (20) ↓");
      await list.evaluate((ul) => ul.parentElement!.scrollTo({ top: 99_999 }));
      await expect(cue).toHaveCount(0);
    } else {
      await expect(cue).toBeHidden();
    }
  });

  await test.step("M5: an exclusions error doesn't linger once the draw locks the pairs", async () => {
    const addPair = async (a: string, b: string) => {
      await page.getByLabel("Unang tao").selectOption({ label: a });
      await page.getByLabel("Pangalawang tao").selectOption({ label: b });
      await page.getByRole("button", { name: "Add pair" }).click();
    };
    await addPair("Bong", "Grace");
    await expect(page.getByRole("list", { name: "Exclusion pairs" })).toContainText("Bong");
    await addPair("Grace", "Bong");
    await expect(page.getByText("Nandiyan na ang pair na 'yan.")).toBeVisible();
    await page.getByRole("button", { name: "Draw names" }).click();
    await page.getByRole("button", { name: "Oo, i-draw na" }).click();
    await expect(page.getByText("Names drawn")).toBeVisible();
    await expect(page.getByText("Nandiyan na ang pair na 'yan.")).toHaveCount(0);
  });

  await test.step("M12 + C5: after the draw, 'Hindi pa bukas' on each row; only date and themes can be edited", async () => {
    await expect(page.getByRole("list", { name: "Members" }).getByText("Hindi pa bukas", { exact: true })).toHaveCount(20);
    await page.getByRole("button", { name: "Edit details" }).click();
    const form = page.getByRole("form", { name: "Edit details" });
    await expect(form.getByText("Na-draw na, kaya ang petsa at themes na lang ang puwedeng baguhin.")).toBeVisible();
    await expect(form.getByLabel("Pangalan ng group")).toHaveCount(0);
    await expect(form.getByLabel("Budget", { exact: true })).toHaveCount(0);
    await expect(form.getByLabel("Petsa ng party")).toBeVisible();
    await form.getByRole("button", { name: "Huwag na" }).click();
    await expect(form).toHaveCount(0);
  });

  await test.step("M8: a new link can be sent straight to the member", async () => {
    await page.getByRole("button", { name: "Manage Zed Cruz", exact: true }).click();
    await page.getByRole("button", { name: "Get new link for Zed Cruz", exact: true }).click();
    await page.getByRole("button", { name: "Oo, gumawa ng bago" }).click();
    const box = page.getByRole("group", { name: "New link for Zed Cruz" });
    await box.getByRole("button", { name: "I-send kay Zed Cruz" }).click();
    await expect.poll(() => shared(page)).toEqual([expect.objectContaining({ url: expect.stringMatching(new RegExp(`/g/${group.slug}/me\\?t=`)) })]);
    const token = new URL((await shared(page))[0].url!).searchParams.get("t")!;
    expect(await page.locator("body").innerText()).not.toContain(token);
  });

  await test.step("M9: after removing someone, a line says it worked and their giver has a new monito", async () => {
    await page.getByRole("button", { name: "Manage Yoyo", exact: true }).click();
    await page.getByRole("button", { name: "Remove Yoyo", exact: true }).click();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Natanggal si Yoyo. May bagong monito na ang nakabunot sa kanya." })).toBeVisible();
    await expect(page.getByText("Members (19)")).toBeVisible();
  });

  await test.step("C1: a 15-minute PIN lock shows on the organizer page, with 'Get new link'", async () => {
    const xian = group.members.Xian.id;
    await db()
      .update(members)
      .set({ pinFailedAttempts: 5, pinLockedUntil: new Date(Date.now() + 10 * 60_000) })
      .where(eq(members.id, xian));
    await page.reload();
    const row = page.getByRole("group", { name: "Maling PIN ni Xian" });
    await expect(row.getByText("Maraming maling PIN kanina")).toBeVisible();
    await row.getByRole("button", { name: "Get new link for Xian (locked)" }).click();
    await expect(page.getByRole("checkbox", { name: /Reset PIN/ })).toBeChecked();
  });

  await test.step("leak: the organizer page (and its responses) show no pairs or codenames", async () => {
    expectOrganizerPageClean(await capturePage(page, `/g/${group.slug}/admin`), await getTruth(group.slug));
  });

  expect(problems).toEqual([]);
});

test("/me: long wish titles, the budget on the wishlist, sending the link, PIN saved (M3, M4, M7, M10)", async ({ browser }, testInfo) => {
  const { problems, loggedIn } = people(browser, testInfo);
  const title = "Tumbler na hindi tumatagas kahit baligtarin";
  const group = await seedGroup(
    {
      name: `Persona me (${testInfo.project.name})`,
      people: ["Tita Nena", "Ben", "Cora"],
      wishes: { "Tita Nena": [{ title, url: "https://shopee.ph/tumbler-123" }] },
    },
    createdSlugs,
  );
  const { page } = await loggedIn("Tita Nena", group.members["Tita Nena"].link);
  await expect(page.getByRole("heading", { name: "Hi, Tita Nena!" })).toBeVisible();

  await test.step("M3: a long title isn't cut off; the link sits on the next line", async () => {
    const wish = page.getByRole("list", { name: "Wishlist mo" }).getByText(title, { exact: true });
    await expect(wish).toBeVisible();
    const fits = await wish.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1);
    expect(fits, "the whole title is visible").toBe(true);
    const titleRow = wish.locator("xpath=..");
    await expect(titleRow.getByRole("link", { name: /shopee\.ph/ })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Wishlist mo" }).getByRole("link", { name: /shopee\.ph/ })).toBeVisible();
  });

  await test.step("M7 + M10: the budget is in the add row; an example says where to send the link", async () => {
    await expect(page.getByText("Hanggang ₱500 ang regalo.")).toBeVisible();
    await expect(page.getByText("Halimbawa: i-send sa sarili mong Messenger o i-save sa Notes.").first()).toBeVisible();
  });

  await test.step("M4: after setting a PIN, the card names a button that's there before and after the draw", async () => {
    await db().update(members).set({ pinHash: null }).where(eq(members.id, group.members["Tita Nena"].id));
    await page.reload();
    const card = page.getByRole("region", { name: "Mag-set ng PIN" });
    await card.getByLabel("4-digit PIN").fill("2468");
    await card.getByRole("button", { name: "I-save ang PIN" }).click();
    await expect(card.getByText("Na-save ang PIN mo!")).toBeVisible();
    await expect(card).toContainText("i-tap ang “Bumalik”");
  });

  expect(problems).toEqual([]);
});

test("party day: the reveal on top of the organizer page; the laptop sends the remote to the phone (C7)", async ({ browser }, testInfo) => {
  const { problems, newPerson } = people(browser, testInfo);
  const group = await seedGroup(
    { name: `Persona party (${testInfo.project.name})`, people: ["Joy", "Ben", "Cora", "Dodong"], partyInDays: 1, draw: true },
    createdSlugs,
  );
  const joy = await newPerson("HR Joy");
  await joy.context.addInitScript(stubShare);
  const { page } = joy;
  await page.goto(group.organizerPath);
  await expect(page).toHaveURL(new RegExp(`/g/${group.slug}/admin$`));
  const token = new URL(group.organizerPath, "http://x").searchParams.get("t")!;

  await test.step("the party is tomorrow: Party reveal comes first, as the main button", async () => {
    await expectCardOrder(page, ["Party reveal", "Names drawn", "Members"]);
    await expect(page.getByRole("link", { name: "Open the reveal screen" })).toHaveAttribute("data-variant", "default");
  });

  await test.step("'Handa na?': on a laptop, 'Gawing remote ang phone mo' sends the organizer link; never shown", async () => {
    await page.getByRole("link", { name: "Open the reveal screen" }).click();
    await expect(page.getByRole("heading", { name: "Handa na?" }).first()).toBeVisible();
    const remote = page.getByRole("region", { name: "Gawing remote ang phone mo" });
    const landscape = await page.evaluate(() => matchMedia("(orientation: landscape)").matches);
    if (!landscape) {
      // A phone held upright already is the remote.
      await expect(remote).toBeHidden();
      return;
    }
    await expect(remote).toBeVisible();
    await remote.getByRole("button", { name: "I-send sa phone ko" }).click();
    await expect.poll(() => shared(page)).toHaveLength(1);
    const url = new URL((await shared(page))[0].url!);
    expect(url.pathname).toBe(`/g/${group.slug}/admin`);
    expect(url.searchParams.get("t")).toBe(token);
    expect(await page.locator("body").innerText(), "the organizer link is never on screen").not.toContain(token);
  });

  await test.step("leak: the reveal screen before the start shows no names or codenames", async () => {
    const truth = await getTruth(group.slug);
    expectRevealPageClean(await capturePage(page, `/g/${group.slug}/reveal`), truth, revealOrderOf(truth, "Joy"), 0);
    const ben = await newPerson("Ben");
    await ben.page.goto(group.members.Ben.link);
    expectMemberPageClean(await capturePage(ben.page, `/g/${group.slug}/me`), truth, "Ben");
  });

  expect(problems).toEqual([]);
});
