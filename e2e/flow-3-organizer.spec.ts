/**
 * Main flow, part 3 of 4, on a phone: the organizer's tools around the
 * draw. Bawal pairs (adding one, an impossible setup flagged and fixed),
 * then removing members after the draw: blocked when it would pair a bawal
 * couple, patched for one giver (with a notice and a new slip), and
 * blocked when only 3 remain. Leak test after the patch.
 *
 * Starts from a seeded group before the draw: Joy, Joy M, Tita Org (the
 * organizer) and Ben, with wishlists. The draw itself runs on the server
 * here (part 2 covers the Draw button).
 */
import { expect, test } from "./test";
import { closeDb } from "../server/db";
import { drawNames, markSlipOpened } from "../server/draw-service";
import { deleteGroups } from "./db-cleanup";
import { openSlip, people, readSlipName, screenshotter, tapToOpen, WISHES } from "./flow";
import { capturePage, expectJoinPageClean, expectMemberPageClean, expectOrganizerPageClean, getTruth } from "./leak";
import { seedGroup } from "./seed";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

test("organizer: bawal pairs, remove after the draw, leaks", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo, "flow-3-organizer");
  const { problems, newPerson, loggedIn } = people(browser, testInfo);
  // Joined in this order. Tita Org is the organizer and a member too.
  const group = await seedGroup(
    {
      name: `Barkada (${testInfo.project.name})`,
      people: ["Joy", "Joy M", "Tita Org", "Ben"],
      wishes: Object.fromEntries(Object.entries(WISHES).map(([name, titles]) => [name, titles.map((title) => ({ title }))])),
    },
    createdSlugs,
  );
  const slug = group.slug;
  const shareUrl = new URL(group.sharePath, testInfo.project.use.baseURL).href;
  const organizer = await loggedIn("organizer", group.organizerPath, group.members["Tita Org"].link);
  const joy = await loggedIn("Joy", group.members.Joy.link);
  const joyM = await loggedIn("Joy M", group.members["Joy M"].link);
  const ben = await loggedIn("Ben", group.members.Ben.link);

  const everyone = [
    { label: "Joy", person: joy },
    { label: "Joy M", person: joyM },
    { label: "Tita Org", person: organizer },
    { label: "Ben", person: ben },
  ];

  const pairList = () => organizer.page.getByRole("list", { name: "Exclusion pairs" });
  const warning = () => organizer.page.locator("main").getByRole("alert");

  async function addPair(first: string, second: string) {
    const { page } = organizer;
    await page.getByLabel("Unang tao").selectOption({ label: first });
    await page.getByLabel("Pangalawang tao").selectOption({ label: second });
    await page.getByRole("button", { name: "Add pair" }).click();
  }

  await test.step("add an exclusion pair (Joy & Joy M)", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await expect(page.getByText("Bawal magkabunot")).toBeVisible();
    await expect(page.getByText("Wala pang bawal.")).toBeVisible();
    await addPair("Joy", "Joy M");
    await expect(pairList().getByRole("listitem")).toHaveCount(1);
    await expect(pairList()).toContainText(/Joy at Joy M|Joy M at Joy/);
    await expect(warning()).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Draw names" })).toBeEnabled();
    await shot(page, "exclusion-added");
  });

  await test.step("an impossible setup is flagged right away", async () => {
    const { page } = organizer;
    await addPair("Joy", "Tita Org");
    await expect(pairList().getByRole("listitem")).toHaveCount(2);
    await expect(warning()).toHaveText("Masyadong maraming bawal kay Joy. Tanggalin ang isa sa mga pair niya.");
    await expect(page.getByRole("button", { name: "Draw names" })).toBeDisabled();
    await expect(page.getByText("Ayusin muna ang mga bawal magkabunot.")).toBeVisible();
    await shot(page, "exclusion-impossible");

    await page.getByRole("button", { name: /Remove pair (Joy and Tita Org|Tita Org and Joy)/ }).click();
    await expect(pairList().getByRole("listitem")).toHaveCount(1);
    await expect(warning()).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Draw names" })).toBeEnabled();
  });

  await test.step("names drawn (on the server); everyone has opened their slip", async () => {
    const drawn = await drawNames(group.groupId, "draw");
    expect(drawn.ok).toBe(true);
    for (const { label } of everyone) await markSlipOpened(group.members[label].id);
    const truth = await getTruth(slug);
    expect(truth.pairs).toHaveLength(4);
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

  // --- Remove after the draw ------------------------------------------------
  // With 4 people and Joy–Joy M excluded, the loop is always
  // Joy → x → Joy M → y → Joy (x, y = Tita Org and Ben). Removing Ben would
  // make Joy and Joy M draw each other; removing Joy can be patched.

  const memberList = () => organizer.page.getByRole("list", { name: "Members" });

  await test.step("remove after the draw: blocked when it would pair an excluded couple", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Manage Ben", exact: true }).click();
    await page.getByRole("button", { name: "Remove Ben", exact: true }).click();
    await expect(page.getByText("Ang nakabunot sa kanya ay bibigyan ng bagong monito", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "Kapag tinanggal si Ben, magkakabunot ang dalawang bawal. Kailangan ng redraw para matanggal siya.",
    );
    await expect(page.getByRole("button", { name: "Tanggalin at i-redraw" })).toBeVisible();
    await shot(page, "remove-needs-redraw");
    await page.getByRole("button", { name: "Huwag" }).click();
    await expect(memberList().getByText("Ben", { exact: true })).toBeVisible();
    expect((await getTruth(slug)).pairs).toHaveLength(4);
  });

  await test.step("remove Joy after the draw: only her giver's monito changes, with a notice", async () => {
    const before = await getTruth(slug);
    const nameOf = new Map(before.members.map((m) => [m.id, m.name]));
    const joyId = before.members.find((m) => m.name === "Joy")!.id;
    const giverName = nameOf.get(before.pairs.find((p) => p.receiverId === joyId)!.giverId)!;
    const newReceiver = nameOf.get(before.pairs.find((p) => p.giverId === joyId)!.receiverId)!;

    const { page } = organizer;
    await page.getByRole("button", { name: "Manage Joy", exact: true }).click();
    await page.getByRole("button", { name: "Remove Joy", exact: true }).click();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(memberList().getByText("Joy", { exact: true })).toHaveCount(0);
    await expect(memberList().getByRole("listitem")).toHaveCount(3);
    await shot(page, "removed-after-draw");

    // Still one valid loop of 3, and the exclusion still holds.
    const after = await getTruth(slug);
    const afterName = new Map(after.members.map((m) => [m.id, m.name]));
    const loop = new Map(after.pairs.map((p) => [afterName.get(p.giverId)!, afterName.get(p.receiverId)!]));
    expect(loop.size).toBe(3);
    expect(loop.get(giverName)).toBe(newReceiver);
    expect(loop.get("Joy M")).not.toBe("Joy");

    const remaining = [
      { label: "Joy M", person: joyM },
      { label: "Tita Org", person: organizer },
      { label: "Ben", person: ben },
    ];
    for (const { label, person } of remaining) {
      const p = person.page;
      await p.goto(`/g/${slug}/me`);
      const notice = p.getByText("Na-update ang monito mo");
      if (label === giverName) {
        // New monito: the notice, and a new folded slip to unfold.
        await expect(notice).toBeVisible();
        await shot(p, "monito-updated-notice");
        expect(await openSlip(p)).toBe(loop.get(label));
        await p.getByRole("button", { name: "Okay, gets ko" }).click();
        await expect(notice).toHaveCount(0);
        await p.reload();
        await expect(p.getByText("Ang monito mo ay…")).toBeVisible();
        await expect(tapToOpen(p)).toHaveCount(0);
        expect(await readSlipName(p)).toBe(loop.get(label));
        await expect(notice).toHaveCount(0);
      } else {
        // Same monito as before: still open.
        await expect(p.getByText("Ang monito mo ay…")).toBeVisible();
        await expect(tapToOpen(p)).toHaveCount(0);
        expect(await readSlipName(p)).toBe(loop.get(label));
        await expect(notice).toHaveCount(0);
      }
    }

    await joy.page.goto(`/g/${slug}/me`);
    await expect(joy.page.getByText("Wala ka na sa group na 'to")).toBeVisible();

    await leakCheck(remaining);
  });

  await test.step("removing someone when only 3 remain is blocked", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Manage Ben", exact: true }).click();
    await page.getByRole("button", { name: "Remove Ben", exact: true }).click();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("3 na lang kayo");
    await expect(memberList().getByRole("listitem")).toHaveCount(3);
    await shot(page, "remove-blocked-three-left");
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
