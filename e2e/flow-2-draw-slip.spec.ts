/**
 * Main flow, part 2 of 4, on a phone: drawing names (confirm, double
 * click), each member unfolding their slip and seeing one receiver and
 * their wishlist, the unfold playing once, the organizer's counts, joining
 * closed, a lost link reissued, a redraw, and the leak test (HTML and
 * network) after each of them.
 *
 * Starts from a seeded group before the draw: Joy, Joy M, Tita Org (the
 * organizer) and Ben, with wishlists and Joy–Joy M as a bawal pair.
 */
import { expect, test } from "./test";
import { formatPartyDate } from "../lib/format";
import { addDays } from "../lib/theme-weeks";
import { closeDb } from "../server/db";
import { deleteGroups } from "./db-cleanup";
import { checkReminder, expectCardOrder, openSlip, people, readSlipName, screenshotter, tapToOpen, watchForGsap, WISHES } from "./flow";
import { readMaskedLink } from "./links";
import { capturePage, expectJoinPageClean, expectMemberPageClean, expectOrganizerPageClean, getTruth } from "./leak";
import { seedGroup } from "./seed";
import type { Response } from "@playwright/test";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

test("draw and slip: draw, unfold, lost link, redraw, leaks", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo, "flow-2-draw-slip");
  const { problems, newPerson, loggedIn } = people(browser, testInfo);
  // Joined in this order. Tita Org is the organizer and a member too.
  const group = await seedGroup(
    {
      name: `Barkada (${testInfo.project.name})`,
      people: ["Joy", "Joy M", "Tita Org", "Ben"],
      wishes: Object.fromEntries(Object.entries(WISHES).map(([name, titles]) => [name, titles.map((title) => ({ title }))])),
      exclusions: [["Joy", "Joy M"]],
    },
    createdSlugs,
  );
  const slug = group.slug;
  const shareUrl = new URL(group.sharePath, testInfo.project.use.baseURL).href;
  const organizer = await loggedIn("organizer", group.organizerPath, group.members["Tita Org"].link);
  const joy = await loggedIn("Joy", group.members.Joy.link);
  const joyM = await loggedIn("Joy M", group.members["Joy M"].link);
  const ben = await loggedIn("Ben", group.members.Ben.link);
  const partyDate = group.partyDate;
  const benLink = group.members.Ben.link;

  await test.step("draw names (confirm; a double click still draws once)", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Draw names" }).click();
    await expect(page.getByText("Pag na-draw na, sarado na ang sali. Sure na?")).toBeVisible();
    await shot(page, "draw-confirm");
    await page.getByRole("button", { name: "Oo, i-draw na" }).dblclick();
    await expect(page.getByText("Names drawn")).toBeVisible();
    await expect(page.getByText("4 na ang may monito.", { exact: false })).toBeVisible();
    await expect(page.getByText("Na-draw na ang names")).toBeVisible();

    // Right after the draw: next steps first, then the draw status, members lower.
    await expect(page.getByText("0 of 4 have opened their slip")).toBeVisible();
    await expectCardOrder(page, [
      "Names drawn",
      "I-announce sa GC",
      "Kasali ka rin, kaya may slip ka.",
      "Members",
      "Share link (para sa GC)",
    ]);
    // The announcement sits inside the "Names drawn" card, right after the draw.
    await expect(page.getByText("I-announce sa GC", { exact: true })).toHaveCount(1);
    // The organizer is a member too, with an unopened slip.
    await expect(page.getByRole("link", { name: "Buksan ang slip mo" })).toHaveAttribute("href", `/g/${slug}/me`);
    // "Na-draw na!" is the default GC message…
    const kind = page.getByRole("group", { name: "Reminder type" });
    await expect(kind.getByRole("button", { name: "Na-draw na" })).toHaveAttribute("aria-pressed", "true");
    await checkReminder(
      browser,
      organizer.page,
      [
        "Na-draw na! Buksan ang personal link mo para makita ang monito mo 🎁",
        'Nawala ang link mo? Buksan \'to tapos i-tap ang "Bumalik sa slip ko":',
        // The share link: the way back for whoever lost their personal link (persona test C6).
        `👉 ${shareUrl}`,
        `🎉 Party: ${formatPartyDate(partyDate)}`,
        "💸 Budget: ₱500",
      ],
      ["Unang theme"],
    );
    await shot(page, "names-drawn-next-steps");
    // …with an easy switch to the theme reminder.
    await kind.getByRole("button", { name: "Theme reminder" }).click();
    await checkReminder(
      browser,
      organizer.page,
      [
        "reminder!",
        `✨ Unang theme: Something soft, simula ${formatPartyDate(addDays(partyDate, -28))}`,
        "💸 Budget: ₱500",
        "Na-update n'yo na ba ang wishlist n'yo?",
        `👉 ${shareUrl}`,
      ],
    );
    // Exclusions are locked now (members can still be removed, with a patch).
    await expect(page.getByRole("button", { name: "Add pair" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove pair/ })).toHaveCount(0);
    await shot(page, "names-drawn");

    const truth = await getTruth(slug);
    expect(truth.pairs).toHaveLength(4);
  });

  const everyone = [
    { label: "Joy", person: joy },
    { label: "Joy M", person: joyM },
    { label: "Tita Org", person: organizer },
    { label: "Ben", person: ben },
  ];

  /** Opens each member's /me and checks one receiver, a valid loop, and exclusions. */
  async function checkResults(shotName: string) {
    const seen = new Map<string, string>();
    for (const { label, person } of everyone) {
      const { page } = person;
      await page.goto(`/g/${slug}/me`);
      // A folded slip first; the wishlist waits until it's unfolded.
      await expect(tapToOpen(page)).toBeVisible();
      await expect(page.getByText(/^Wishlist ni /)).toHaveCount(0);
      if (label === "Joy") await shot(page, `${shotName}-folded`);
      const receiverName = await openSlip(page);
      await expect(page.getByText("Ang monito mo ay…")).toBeVisible();
      seen.set(label, receiverName);

      // The receiver's wishlist (latest version) shows under the slip.
      const theirWishes = WISHES[receiverName];
      await expect(page.getByText(`Wishlist ni ${receiverName}`)).toBeVisible();
      if (theirWishes.length === 0) {
        await expect(page.getByText(`Wala pang wishlist si ${receiverName}.`, { exact: false })).toBeVisible();
      } else {
        const list = page.getByRole("list", { name: "Wishlist ng monito mo" });
        await expect(list.getByRole("listitem")).toHaveCount(theirWishes.length);
        for (const title of theirWishes) await expect(list.getByText(title, { exact: true })).toBeVisible();
      }
      if (label === "Joy") await shot(page, shotName);
    }

    // Matches the database, and forms one valid loop.
    const truth = await getTruth(slug);
    const nameOf = new Map(truth.members.map((m) => [m.id, m.name]));
    const expected = new Map(truth.pairs.map((p) => [nameOf.get(p.giverId)!, nameOf.get(p.receiverId)!]));
    expect(seen).toEqual(expected);
    expect(new Set(seen.values()).size).toBe(4);
    for (const [giver, receiver] of seen) expect(receiver).not.toBe(giver);
    let current = "Joy";
    for (let i = 0; i < 4; i++) current = seen.get(current)!;
    expect(current, "one loop through all 4").toBe("Joy");
    // The excluded pair didn't draw each other.
    expect(seen.get("Joy")).not.toBe("Joy M");
    expect(seen.get("Joy M")).not.toBe("Joy");
    return seen;
  }

  let firstDraw = new Map<string, string>();
  await test.step("each member sees exactly one receiver; exclusions held", async () => {
    firstDraw = await checkResults("joy-sees-monito");
  });

  await test.step("the slip unfolds once: later visits show it open, without GSAP", async () => {
    const { page } = joy;
    const loads = watchForGsap(page);
    await page.reload();
    await expect(page.getByText("Ang monito mo ay…")).toBeVisible();
    await expect(page.getByText(/^Wishlist ni /)).toBeVisible();
    await expect(tapToOpen(page)).toHaveCount(0);
    expect(await readSlipName(page)).toBe(firstDraw.get("Joy"));
    await page.waitForLoadState("networkidle");
    expect(loads.gsap, "GSAP downloaded for an already-open slip").toBe(false);

    // The organizer sees a count, never who.
    await organizer.page.goto(`/g/${slug}/admin`);
    await expect(organizer.page.getByText("4 of 4 have opened their slip")).toBeVisible();
    // Most have opened: the next steps give way to the usual layout, and the
    // theme reminder is the default again.
    await expect(organizer.page.getByText("Kasali ka rin, kaya may slip ka.")).toHaveCount(0);
    await expect(organizer.page.getByRole("link", { name: "Buksan ang slip mo" })).toHaveCount(0);
    await expectCardOrder(organizer.page, ["Names drawn", "Paalala para sa GC", "Members", "Share link (para sa GC)"]);
    await expect(
      organizer.page.getByRole("group", { name: "Reminder type" }).getByRole("button", { name: "Theme reminder" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(organizer.page.getByLabel("Reminder preview")).toContainText("Na-update n'yo na ba ang wishlist n'yo?");
    await shot(organizer.page, "admin-most-opened");
  });

  await test.step("joining is closed after the draw", async () => {
    const late = await newPerson("Late Larry");
    await late.page.goto(shareUrl);
    await expect(late.page.getByText("Tapos na ang bunutan")).toBeVisible();
    await expect(late.page.getByLabel("Pangalan mo")).toHaveCount(0);
    await expect(late.page.getByRole("link", { name: "Bumalik sa slip ko" })).toBeVisible();
    await shot(late.page, "join-closed");
    await late.context.close();
  });

  async function leakCheck(people = everyone) {
    const truth = await getTruth(slug);
    expectOrganizerPageClean(await capturePage(organizer.page, `/g/${slug}/admin`), truth);
    const stranger = await newPerson("Stranger");
    expectJoinPageClean(await capturePage(stranger.page, shareUrl), truth);
    await stranger.context.close();
    for (const { label, person } of people) {
      expectMemberPageClean(await capturePage(person.page, `/g/${slug}/me`), truth, label);
    }
  }

  await test.step("leak test: no page exposes anyone else's pair (HTML + network)", async () => {
    await leakCheck();
  });

  await test.step("lost link: organizer gets Ben a new one; the old link and cookie stop working", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Manage Ben", exact: true }).click();
    await page.getByRole("button", { name: "Get new link for Ben" }).click();
    await expect(page.getByText("Hindi na gagana ang luma niyang link", { exact: false })).toBeVisible();
    await shot(page, "new-link-confirm");

    // The action's response carries the new link only: no pairs, no codenames.
    const truth = await getTruth(slug);
    const responses: Promise<string>[] = [];
    const onResponse = (r: Response) => {
      if (r.request().method() === "POST") responses.push(r.text().catch(() => ""));
    };
    page.on("response", onResponse);
    await page.getByRole("button", { name: "Oo, gumawa ng bago" }).click();
    // Masked on screen like /me; "Copy link" has the real one.
    const newLink = await readMaskedLink(page, {
      scope: page.getByRole("group", { name: "New link for Ben" }),
      copyLabel: "Copy link",
      pageName: "me",
    });
    expect(newLink).toContain(`/g/${slug}/me?t=`);
    page.off("response", onResponse);
    expect(newLink).not.toBe(benLink);
    expectOrganizerPageClean((await Promise.all(responses)).join("\n"), truth);
    const benRow = page.getByRole("list", { name: "Members" }).getByRole("listitem").filter({ hasText: "Ben" });
    await expect(benRow.getByText("New link · not opened yet")).toBeVisible();
    // Only Ben's row carries a status.
    await expect(page.getByText(/^New link · /)).toHaveCount(1);
    await shot(page, "new-link-shown");

    // The organizer opens it on their own phone (logged in as Tita Org):
    // asked first; staying doesn't count as opened.
    await page.goto(newLink);
    await expect(page.getByText("Naka-login ka bilang Tita Org sa device na 'to. Ikaw ba talaga si Ben?")).toBeVisible();
    await page.getByRole("button", { name: "Stay as Tita Org", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hi, Tita Org!" })).toBeVisible();
    await page.goto(`/g/${slug}/admin`);
    await expect(benRow.getByText("New link · not opened yet")).toBeVisible();

    // Ben's old cookie no longer works on his phone…
    await ben.page.goto(`/g/${slug}/me`);
    await expect(ben.page.getByText("Hindi na gumagana ang link na 'to")).toBeVisible();
    await expect(ben.page.getByRole("link", { name: "Bumalik gamit ang PIN" })).toBeVisible();
    // …nor does his old link on another phone.
    const oldLinkPhone = await newPerson("Ben (old link)");
    await oldLinkPhone.page.goto(benLink);
    await expect(oldLinkPhone.page).toHaveURL(new RegExp(`/g/${slug}/me[?]link=old$`));
    await expect(oldLinkPhone.page.getByText("Hindi na gumagana ang link na 'to")).toBeVisible();
    await oldLinkPhone.context.close();

    // The new link works, and his slip is still open.
    await ben.page.goto(newLink);
    await expect(ben.page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(ben.page.getByRole("heading", { name: "Hi, Ben!" })).toBeVisible();
    await expect(tapToOpen(ben.page)).toHaveCount(0);
    expect(await readSlipName(ben.page)).toBe(firstDraw.get("Ben"));

    // Now the organizer sees it was opened. Status only.
    await page.goto(`/g/${slug}/admin`);
    await expect(benRow.getByText("New link · opened")).toBeVisible();
    await shot(page, "new-link-opened");

    await leakCheck();
  });

  await test.step("redraw replaces everyone's monito", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    const before = (await getTruth(slug)).pairs.map((p) => p.id);
    await page.getByRole("button", { name: "Redraw" }).click();
    await expect(page.getByText("Magbabago ang monito ng lahat.")).toBeVisible();
    await shot(page, "redraw-confirm");
    await page.getByRole("button", { name: "Oo, i-redraw" }).click();
    await expect(page.getByText("Magbabago ang monito ng lahat.")).toHaveCount(0);
    await expect(page.getByText("Names drawn")).toBeVisible();
    // Everyone's monito changed, so everyone unfolds a new slip.
    await expect(page.getByText("0 of 4 have opened their slip")).toBeVisible();

    const after = await getTruth(slug);
    expect(after.pairs).toHaveLength(4);
    expect(after.pairs.some((p) => before.includes(p.id)), "all assignment rows replaced").toBe(false);

    // With 4 people and Joy–Joy M excluded, a redraw may land on the same
    // loop by chance; what matters is it's a fresh, valid draw.
    const secondDraw = await checkResults("joy-sees-monito-after-redraw");
    expect(secondDraw.size).toBe(firstDraw.size);
    await leakCheck();
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
