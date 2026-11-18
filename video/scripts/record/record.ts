/**
 * Records R1-R4 for the demo video against a local production build of the
 * app and the DEV database, seeding the storyboard's group in between.
 *
 *   npm run build && npx next start -p 3100            (in the app, with
 *     NEXT_PUBLIC_SITE_URL=https://monitomonita-ph.vercel.app at build time)
 *   npx tsx video/scripts/record/record.ts all         (from the repo root)
 *   npx tsx video/scripts/record/record.ts cleanup     (deletes the group)
 *
 * Steps (also runnable one by one): r1 seed-members r2 seed-draw r2b r3 r4.
 * `seed-reveal r4` re-records just the reveal on a freshly seeded group.
 * State (slug, cookies) lives in video/.rec/ (gitignored).
 */
process.loadEnvFile(".env.local");
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_THEMES } from "../../../lib/theme-weeks";
import { createGroup } from "../../../server/groups";
import { joinGroup } from "../../../server/members";
import { Recorder } from "./lib/recorder";
import {
  addWishlists,
  closeDb,
  deleteRecordingGroup,
  drawJoyCarlo,
  groupBySlug,
  GROUP_NAME,
  joinOthers,
  joyJoinedFirst,
  OPEN_ORDER,
  OTHERS,
  PIN,
  setCodenames,
  setOpenedExactly,
} from "./lib/seed";

const BASE = process.env.REC_BASE ?? "http://localhost:3100";
const VIDEO = join(__dirname, "..", "..");
const REC = join(VIDEO, ".rec");
const OUT = join(VIDEO, "public", "rec");
const STATE = join(REC, "state.json");
mkdirSync(REC, { recursive: true });
mkdirSync(OUT, { recursive: true });

type State = { slug?: string; groupId?: string; organizerToken?: string };
const readState = (): State => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {});
const writeState = (s: State) => writeFileSync(STATE, JSON.stringify(s, null, 1));

const LAPTOP = { width: 1366, height: 854 };
const PHONE = { width: 390, height: 844 };
const TV = { width: 1920, height: 1080 };

/** Smooth scroll on the virtual clock, one step per frame. */
async function scrollTo(rec: Recorder, y: number, frames: number) {
  const from = await rec.page.evaluate(() => window.scrollY);
  for (let i = 1; i <= frames; i++) {
    const t = i / frames;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await rec.page.evaluate((v) => window.scrollTo(0, v), from + (y - from) * e);
    await rec.advance(1);
  }
}

/**
 * The keys to type for a date in this browser's date field: its segment
 * order follows the machine's locale (dd/mm/yyyy here), so probe it once.
 */
async function dateKeys(rec: Recorder, iso: string): Promise<string> {
  const probe = await rec.context.newPage();
  await probe.setContent('<input type="date" id="d">');
  await probe.locator("#d").focus();
  await probe.keyboard.type("01022026");
  const value = await probe.locator("#d").inputValue();
  await probe.close();
  const [y, m, d] = iso.split("-");
  if (value === "2026-02-01") return `${d}${m}${y}`;
  if (value === "2026-01-02") return `${m}${d}${y}`;
  throw new Error(`Unknown date field order (${value})`);
}

// --- R1: create the group on a laptop -------------------------------------------

async function r1() {
  const rec = new Recorder({ name: "r1-create", outDir: OUT, viewport: LAPTOP, scale: 2 });
  await rec.start();
  const p = rec.page;
  const partyKeys = await dateKeys(rec, "2026-12-19");
  await rec.open(`${BASE}/new`, "h1");
  await rec.placePointer({ x: 1010, y: 640 });
  rec.mark("start");
  await rec.hold(30);

  const name = p.getByRole("textbox", { name: "Pangalan ng group" });
  await rec.moveTo(await rec.point(name, 0.22, 0.55), 30);
  await rec.click(4);
  rec.mark("typeName");
  await rec.type(GROUP_NAME, 5);
  await rec.hold(8);

  const date = p.locator('input[name="partyDate"]');
  await rec.moveTo(await rec.point(date, 0.1, 0.55), 22);
  await rec.click(4);
  rec.mark("typeDate");
  await rec.type(partyKeys, 5, 0.2);
  if ((await date.inputValue()) !== "2026-12-19") throw new Error(`Party date is ${await date.inputValue()}`);
  await rec.hold(6);

  const budget = p.locator('input[name="budget"]');
  await rec.moveTo(await rec.point(budget, 0.25, 0.55), 18);
  await rec.click(4);
  rec.mark("typeBudget");
  await rec.type("500", 6, 0.2);
  rec.mark("typed");
  await rec.hold(24);

  // "Create group" sits below the fold at 1366x854: scroll like a person would.
  const create = p.getByRole("button", { name: "Create group" });
  const box = await create.boundingBox();
  const target = Math.max(0, Math.round(box!.y + box!.height + 48 - LAPTOP.height));
  rec.mark("scroll");
  await scrollTo(rec, target, 26);
  await rec.hold(4);
  await rec.moveTo(await rec.point(create, 0.42, 0.55), 26);
  rec.mark("createClick");
  await rec.click(4);
  const ready = p.getByRole("heading", { name: "Ready na ang group mo!" });
  await rec.waitFor(() => ready.isVisible(), { pendingFrames: 10 });
  await p.evaluate(() => window.scrollTo(0, 0));
  rec.mark("ready");
  await rec.hold(36);

  const shareText = (await p.locator("p.select-all").first().innerText()).trim();
  const slug = shareText.split("/g/")[1];
  if (!slug) throw new Error(`No slug in "${shareText}"`);
  const g = await groupBySlug(slug);
  writeState({ slug, groupId: g.id });
  console.log("R1 group", slug);

  const copy = p.getByRole("button", { name: "Copy link" });
  await rec.moveTo(await rec.point(copy, 0.45, 0.55), 26);
  rec.mark("copyClick");
  await rec.click(4);
  await rec.hold(70);
  rec.mark("end");

  await rec.context.storageState({ path: join(REC, "r1-state.json") });
  const linkBox = await p.locator("p.select-all").first().boundingBox();
  await rec.finish({ shareText, linkBox });
}

// --- Seed: the other 11 join, codenames, wishlists ---------------------------------

async function seedMembers() {
  const { slug, groupId } = readState();
  if (!slug || !groupId) throw new Error("Run r1 first");
  await groupBySlug(slug);
  await joinOthers(slug);
  console.log("joined 11 members");
}

// --- R2: Joy joins on a phone --------------------------------------------------

async function r2() {
  const { slug } = readState();
  if (!slug) throw new Error("Run r1 first");
  const rec = new Recorder({ name: "r2-join", outDir: OUT, viewport: PHONE, scale: 3, mobile: true });
  await rec.start();
  const p = rec.page;
  await rec.open(`${BASE}/g/${slug}`, "#displayName");
  rec.mark("start");
  await rec.hold(24);

  const nameField = p.locator("#displayName");
  const nameAt = await rec.point(nameField, 0.3, 0.5);
  rec.mark("tapName");
  await rec.tap(nameAt);
  await rec.hold(10);
  rec.mark("typeName");
  await rec.type("Joy", 8, 0.15);
  await rec.hold(12);

  // PIN: one real input over four boxes. Tap the first box, then type; a
  // tap ring is logged on each box as the digit lands (as in the storyboard).
  const pin = p.locator("#pin");
  const pinBox = (await pin.boundingBox())!;
  const boxAt = (i: number) => ({ x: pinBox.x + (pinBox.width * (2 * i + 1)) / 8, y: pinBox.y + pinBox.height / 2 });
  rec.mark("pin");
  await rec.tap(boxAt(0));
  await rec.hold(6);
  for (let i = 0; i < 4; i++) {
    if (i > 0) rec.log.push({ f: rec.frames, t: "tap", ...boxAt(i) });
    await p.keyboard.type(PIN[i]);
    await rec.hold(i === 3 ? 14 : 10);
  }

  const join_ = p.getByRole("button", { name: "Join the group" });
  rec.mark("joinTap");
  await rec.tap(await rec.point(join_, 0.5, 0.5));
  // The join drop starts when the server answers.
  await rec.waitFor(async () => (await p.locator("text=Kasali ka na!").count()) > 0 || p.url().includes("/me"), { pendingFrames: 6 });
  rec.mark("drop");
  // Play the drop on the clock until it hands off to /me.
  for (let i = 0; i < 240 && !p.url().includes("/me"); i++) await rec.advance(1);
  rec.mark("dropEnd");
  await rec.waitFor(async () => p.url().includes("/me") && (await p.getByText("Hi,").count()) > 0);
  rec.mark("me");
  await rec.hold(40);
  rec.mark("end");
  await rec.context.storageState({ path: join(REC, "r2-state.json") });
  await rec.finish();
}

// --- Seed: Joy first in the loop, codenames, wishlists, the draw ---------------------

async function seedDraw() {
  const { slug, groupId } = readState();
  if (!slug || !groupId) throw new Error("Run r1 first");
  await groupBySlug(slug);
  await setCodenames(groupId);
  await addWishlists(groupId);
  await joyJoinedFirst(groupId);
  const tries = await drawJoyCarlo(groupId);
  console.log(`drawn: Joy draws Carlo (try ${tries})`);
}

// --- R2b: /me after the draw, folded slip, then the real unfold (reference) ----------

async function r2b() {
  const { slug, groupId } = readState();
  if (!slug || !groupId) throw new Error("Run r1 first");
  await setOpenedExactly(groupId, []);
  const rec = new Recorder({
    name: "r2b-me",
    outDir: OUT,
    viewport: PHONE,
    scale: 3,
    mobile: true,
    storageState: join(REC, "r2-state.json"),
  });
  await rec.start();
  const p = rec.page;
  await rec.open(`${BASE}/g/${slug}/me`, "text=Tap to open your bunutan");
  rec.mark("start");
  await rec.holdSeconds(4);
  // The whole sky panel is the button (gone once the slip is open).
  const slip = p.locator('button[data-part="caption"]');
  const panel = await slip.boundingBox();
  const at = await rec.point(slip, 0.5, 0.4);
  rec.mark("tapSlip");
  await rec.tap(at);
  await rec.holdSeconds(3.5);
  rec.mark("end");
  await rec.finish({ panel });
}

// --- R3: the organizer page as slips get opened (stills, one per state) ---------------

async function r3() {
  const { slug, groupId } = readState();
  if (!slug || !groupId) throw new Error("Run r1 first");
  // Organizer and Joy's member cookies together: the "My slip / Manage group" tabs.
  const org = JSON.parse(readFileSync(join(REC, "r1-state.json"), "utf8"));
  const joy = JSON.parse(readFileSync(join(REC, "r2-state.json"), "utf8"));
  const storageState = { cookies: [...org.cookies, ...joy.cookies], origins: org.origins };
  const rec = new Recorder({ name: "r3-organizer", outDir: OUT, viewport: LAPTOP, scale: 2, storageState, encode: false });
  await rec.start();
  const dir = join(OUT, "r3");
  for (let n = 0; n <= 12; n++) {
    await setOpenedExactly(groupId, OPEN_ORDER.slice(0, n));
    await rec.open(`${BASE}/g/${slug}/admin`, "text=have opened their slip");
    await rec.still(join(dir, `opened-${String(n).padStart(2, "0")}.png`));
    console.log("R3 state", n);
  }
  await rec.finish();
}

// --- R4: the party reveal on a TV (4K), controls hidden ------------------------------------

/**
 * A self-contained group for R4 alone (no R1/R2 needed): created and joined
 * through the app's own functions, Joy first (so the reveal starts with
 * her), the real draw until Joy draws Carlo, every slip opened.
 */
async function seedReveal() {
  const created = await createGroup({ name: GROUP_NAME, budget: 500, partyDate: "2026-12-19", themes: [...SAMPLE_THEMES] });
  writeState({ slug: created.slug, groupId: created.groupId, organizerToken: created.organizerToken });
  for (const name of ["Joy", ...OTHERS]) {
    const joined = await joinGroup(created.slug, name, PIN);
    if (!joined.ok) throw new Error(`${name}: ${joined.message}`);
  }
  await setCodenames(created.groupId);
  await addWishlists(created.groupId);
  const tries = await drawJoyCarlo(created.groupId);
  await setOpenedExactly(created.groupId, OPEN_ORDER);
  console.log(`seeded ${created.slug}: Joy draws Carlo (try ${tries})`);
}

/**
 * The app's projector mode: after 3 s without the mouse the controls fade
 * out, so the mouse never moves here. The reveal is started with click
 * events sent straight to the (hidden) buttons, then Space, like a
 * presenter with a keyboard.
 */
async function r4() {
  const { slug, groupId, organizerToken } = readState();
  if (!slug || !groupId) throw new Error("Run seed-reveal (or r1) first");
  await setOpenedExactly(groupId, OPEN_ORDER);
  const rec = new Recorder({
    name: "r4-reveal",
    outDir: OUT,
    viewport: TV,
    scale: 2,
    storageState: organizerToken ? undefined : join(REC, "r1-state.json"),
    jpegQuality: 92,
  });
  await rec.start();
  const p = rec.page;
  if (organizerToken) await rec.open(`${BASE}/g/${slug}/admin?t=${organizerToken}`, "h1");
  await rec.open(`${BASE}/g/${slug}/reveal`, "text=Handa na?");
  // Let projector mode hide the controls (3 s on the app's clock), off camera.
  await rec.advance(Math.ceil(3400 / 16), false);
  rec.mark("start");
  await rec.hold(70);

  await p.getByRole("button", { name: "Simulan ang reveal" }).dispatchEvent("click");
  await rec.waitFor(async () => (await p.getByRole("button", { name: "Oo, simulan na" }).count()) > 0);
  await p.getByRole("button", { name: "Oo, simulan na" }).dispatchEvent("click");
  const atStep = (n: number) => async () => (await p.locator("[data-count]").filter({ hasText: new RegExp(`^${n} of 12$`) }).count()) > 0;
  await rec.waitFor(atStep(1));
  rec.mark("step1");
  await rec.hold(260);

  // Steps 2 to 11 play off camera (the cut skips them).
  for (let step = 2; step <= 11; step++) {
    await p.keyboard.press("Space");
    await rec.waitFor(atStep(step));
    await rec.advance(80, false);
  }
  await p.keyboard.press("Space");
  await rec.waitFor(atStep(12));
  rec.mark("step12");
  await rec.hold(110);
  // "Ilawan ang parol"
  await p.keyboard.press("Space");
  await rec.waitFor(async () => (await p.getByText("Maligayang Pasko!").count()) > 0);
  rec.mark("finale");
  await rec.holdSeconds(6);
  rec.mark("end");
  await rec.finish();
}

async function cleanup() {
  const { slug } = readState();
  if (!slug) {
    console.log("nothing to clean up");
    return;
  }
  const n = await deleteRecordingGroup(slug);
  console.log(`deleted ${n} group(s): ${slug}`);
  for (const f of ["state.json", "r1-state.json", "r2-state.json"]) rmSync(join(REC, f), { force: true });
}

const steps: Record<string, () => Promise<void>> = {
  r1,
  "seed-members": seedMembers,
  r2,
  "seed-draw": seedDraw,
  r2b,
  r3,
  "seed-reveal": seedReveal,
  r4,
  cleanup,
};

async function main() {
  const args = process.argv.slice(2);
  const list = args[0] === "all" ? ["r1", "seed-members", "r2", "seed-draw", "r2b", "r3", "r4"] : args;
  for (const name of list) {
    const fn = steps[name];
    if (!fn) throw new Error(`Unknown step ${name}`);
    const t0 = Date.now();
    console.log(`--- ${name}`);
    await fn();
    console.log(`--- ${name} done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  await closeDb();
}

main().catch(async (e) => {
  console.error(e);
  await closeDb().catch(() => {});
  process.exit(1);
});
