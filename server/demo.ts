/**
 * One-click demo (docs/PRODUCT.md, "Demo"): a sandbox group made for one
 * visitor, so a recruiter or client can try the whole thing alone in about
 * two minutes.
 *
 * - Eight made-up members with codenames and wishlists, theme weeks around
 *   today, a party about a week away, one bawal pair, names already drawn.
 * - The visitor is the organizer and one member, with their slip still
 *   folded.
 * - Marked `is_demo` with an expiry 24 hours out. Cleanup deletes only rows
 *   that are demos AND expired; a real group has no expiry (a database
 *   check enforces it), so cleanup can't reach one.
 *
 * The plan (who, what, when) is pure and unit tested; the database part
 * builds it in one transaction with the same draw as a real group.
 */
import { and, count, eq, gt, isNotNull, lte } from "drizzle-orm";
import { z } from "zod";
import { addDays, DEFAULT_TIMEZONE, themeStartDates, todayIn } from "@/lib/theme-weeks";
import { createToken, hashToken } from "./auth";
import { pickCodename } from "./codenames";
import { db } from "./db";
import { exclusions, groups, members, themeWeeks, wishlistItems } from "./db/schema";
import { cryptoRandomInt, type RandomInt } from "./draw";
import { drawInTransaction } from "./draw-service";
import { sortPair } from "./exclusions";
import { createSlug } from "./groups";
import { isSameName, NAME_MAX, normalizeDisplayName } from "./names";

export const DEMO_TTL_HOURS = 24;
/** Most demos alive at once; past this, new visitors wait a bit. */
export const MAX_ACTIVE_DEMOS = 200;
export const DEMO_DEFAULT_NAME = "Bisita";
export const DEMO_PARTY_IN_DAYS = 8;
export const DEMO_BUDGET = 500;
export const DEMO_THEMES = ["Something soft", "Something sweet", "Something red"] as const;

/** The tag on every demo page. */
export const DEMO_BANNER = "Demo group 'to. Mabubura after 24 hours.";

export const DEMO_FULL_MESSAGE =
  "Ang daming nagde-demo ngayon. Subukan ulit in a few minutes, o gumawa na ng totoong group.";

/** The visitor's name: optional, cleaned like a join, "Bisita" when blank. */
export const demoNameSchema = z
  .string()
  .optional()
  .transform((v) => normalizeDisplayName(v ?? ""))
  .pipe(z.string().max(NAME_MAX, `Hanggang ${NAME_MAX} characters lang ang pangalan.`))
  .transform((v) => v || DEMO_DEFAULT_NAME);

interface DemoWish {
  title: string;
  url?: string;
  note?: string;
}

interface DemoPerson {
  name: string;
  wishes: DemoWish[];
}

/** The made-up barkada. One spare, used only if the visitor shares a name. */
export const DEMO_PEOPLE: readonly DemoPerson[] = [
  {
    name: "Ate Joy",
    wishes: [
      { title: "Tumbler na may straw", note: "Kahit anong kulay, basta hindi pink" },
      { title: "Planner para sa 2027", url: "https://www.fullybookedonline.com/" },
      { title: "Mabangong hand cream" },
    ],
  },
  {
    name: "Kuya Ben",
    wishes: [
      { title: "Maliit na Bluetooth speaker", note: "Para sa banyo, haha" },
      { title: "Makapal na medyas (3 pairs)" },
    ],
  },
  {
    name: "Tita Luz",
    wishes: [
      { title: "Scented candle", note: "Lavender o vanilla" },
      { title: "Bagong bilao para sa pancit" },
      { title: "Tea sampler" },
    ],
  },
  {
    name: "Carlo",
    wishes: [
      { title: "Keycaps para sa keyboard ko", url: "https://shopee.ph/search?keyword=keycaps" },
      { title: "Hoodie, size L", note: "Plain lang, walang print" },
    ],
  },
  {
    name: "Bianca",
    wishes: [
      { title: "Sketchbook (A5)" },
      { title: "Brush pens", note: "Yung pang-calligraphy" },
      { title: "Washi tape" },
    ],
  },
  {
    name: "Paolo",
    wishes: [
      { title: "Coffee beans galing Sagada o Benguet" },
      { title: "French press", url: "https://www.lazada.com.ph/catalog/?q=french+press" },
    ],
  },
  {
    name: "Mang Jun",
    wishes: [{ title: "Tsinelas, size 10" }, { title: "Kapeng barako" }],
  },
  {
    name: "Inday",
    wishes: [{ title: "Sunscreen" }, { title: "Claw clips", note: "Malaki, yung kaya ang makapal na buhok" }],
  },
  {
    name: "Aira",
    wishes: [{ title: "Phone ring holder" }, { title: "Mini photo album" }],
  },
];

export const DEMO_MEMBER_COUNT = 8;
/** "Bawal magkabunot": the married couple. */
export const DEMO_EXCLUSION: readonly [string, string] = ["Ate Joy", "Kuya Ben"];
/** Made-up members who have already unfolded their slip (5 of them unless the spare is in; the visitor opening theirs makes "6 of 9"). */
export const DEMO_OPENED: readonly string[] = ["Ate Joy", "Carlo", "Bianca", "Paolo", "Inday", "Aira"];

export interface DemoPlan {
  groupName: string;
  budget: number;
  partyDate: string;
  themes: { title: string; startDate: string }[];
  visitor: string;
  /** Made-up members in join order (after the visitor). */
  people: DemoPerson[];
  /** Names, both among `people`, or null if one of them made way for the visitor. */
  exclusion: readonly [string, string] | null;
  opened: string[];
}

/**
 * The demo group for a visitor, relative to `today` (Manila). Pure.
 * Theme weeks count back from the party as in a real group, so with the
 * party 8 days out there is one week over, one this week and one next.
 */
export function demoPlan(today: string, visitorName: string): DemoPlan {
  const visitor = demoNameSchema.parse(visitorName);
  const people = DEMO_PEOPLE.filter((p) => !isSameName(p.name, visitor)).slice(0, DEMO_MEMBER_COUNT);
  const names = new Set(people.map((p) => p.name));
  const partyDate = addDays(today, DEMO_PARTY_IN_DAYS);
  const starts = themeStartDates(partyDate, DEMO_THEMES.length);
  return {
    groupName: `Barkada Pasko ${today.slice(0, 4)}`,
    budget: DEMO_BUDGET,
    partyDate,
    themes: DEMO_THEMES.map((title, i) => ({ title, startDate: starts[i] })),
    visitor,
    people,
    exclusion: DEMO_EXCLUSION.every((n) => names.has(n)) ? DEMO_EXCLUSION : null,
    opened: DEMO_OPENED.filter((n) => names.has(n)),
  };
}

// --- Database ----------------------------------------------------------------

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

export interface CreatedDemo {
  groupId: string;
  slug: string;
  /** Raw tokens for the visitor's two cookies; only hashes are stored. */
  organizerToken: string;
  memberToken: string;
}

function isSlugCollision(error: unknown): boolean {
  const e = error as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
  return (e.cause?.code ?? e.code) === "23505" && (e.cause?.constraint ?? e.constraint) === "groups_slug_unique";
}

/**
 * Builds a fresh demo group in one transaction: the group (a demo,
 * expiring in 24 hours), theme weeks, the visitor (first to join, so the
 * reveal starts with their slip) and the made-up members with wishlists,
 * the bawal pair, then the real draw. The visitor's slip stays folded.
 */
export async function createDemoGroup(
  visitorName: string,
  { now = new Date(), random = cryptoRandomInt }: { now?: Date; random?: RandomInt } = {},
): Promise<CreatedDemo> {
  const plan = demoPlan(todayIn(DEFAULT_TIMEZONE, now), visitorName);
  const organizerToken = createToken();
  const memberToken = createToken();

  for (let attempt = 1; ; attempt++) {
    const slug = createSlug();
    try {
      const groupId = await db().transaction(async (tx) => {
        const [group] = await tx
          .insert(groups)
          .values({
            slug,
            name: plan.groupName,
            budget: plan.budget,
            partyDate: plan.partyDate,
            timezone: DEFAULT_TIMEZONE,
            organizerTokenHash: hashToken(organizerToken),
            isDemo: true,
            demoExpiresAt: addMinutes(now, DEMO_TTL_HOURS * 60),
          })
          .returning({ id: groups.id });

        await tx.insert(themeWeeks).values(plan.themes.map((t, position) => ({ groupId: group.id, ...t, position })));

        // Joined over the past week: the visitor first, then everyone else.
        const taken: string[] = [];
        const rows = [plan.visitor, ...plan.people.map((p) => p.name)].map((displayName, i) => {
          const codename = pickCodename(taken, random);
          taken.push(codename);
          return {
            groupId: group.id,
            displayName,
            codename,
            tokenHash: hashToken(i === 0 ? memberToken : createToken()),
            joinedAt: addMinutes(now, -(7 * 24 * 60) + i * 11 * 60),
          };
        });
        const inserted = await tx
          .insert(members)
          .values(rows)
          .returning({ id: members.id, displayName: members.displayName });
        const idOf = new Map(inserted.map((m) => [m.displayName, m.id]));

        const wishes = plan.people.flatMap((p) =>
          p.wishes.map((w, position) => ({
            memberId: idOf.get(p.name)!,
            title: w.title,
            url: w.url ?? null,
            note: w.note ?? null,
            position,
          })),
        );
        if (wishes.length > 0) await tx.insert(wishlistItems).values(wishes);

        if (plan.exclusion) {
          const [memberAId, memberBId] = sortPair(idOf.get(plan.exclusion[0])!, idOf.get(plan.exclusion[1])!);
          await tx.insert(exclusions).values({ groupId: group.id, memberAId, memberBId });
        }

        const drawn = await drawInTransaction(tx, group.id, random);
        if (!drawn.ok) throw new Error(`demo draw failed: ${drawn.message}`);

        for (const name of plan.opened) {
          await tx
            .update(members)
            .set({ slipOpenedAt: addMinutes(now, -60) })
            .where(eq(members.id, idOf.get(name)!));
        }
        return group.id;
      });
      return { groupId, slug, organizerToken, memberToken };
    } catch (error) {
      if (attempt < 3 && isSlugCollision(error)) continue;
      throw error;
    }
  }
}

/**
 * Deletes expired demo groups (cascades to everything in them). The only
 * bulk delete of groups in the app: it matches demos only, and only once
 * expired. Returns how many went.
 */
export async function deleteExpiredDemos(now: Date = new Date()): Promise<number> {
  const removed = await db()
    .delete(groups)
    .where(and(eq(groups.isDemo, true), isNotNull(groups.demoExpiresAt), lte(groups.demoExpiresAt, now)))
    .returning({ id: groups.id });
  return removed.length;
}

/** Demo groups that haven't expired yet. */
export async function countActiveDemos(now: Date = new Date()): Promise<number> {
  const [row] = await db()
    .select({ n: count() })
    .from(groups)
    .where(and(eq(groups.isDemo, true), gt(groups.demoExpiresAt, now)));
  return row?.n ?? 0;
}

/** Deletes one demo group (Reset demo). Never touches a real group: returns false instead. */
export async function deleteDemoGroup(groupId: string): Promise<boolean> {
  const removed = await db()
    .delete(groups)
    .where(and(eq(groups.id, groupId), eq(groups.isDemo, true)))
    .returning({ id: groups.id });
  return removed.length > 0;
}

export type StartDemoResult = ({ ok: true } & CreatedDemo) | { ok: false; reason: "FULL"; message: string };

/**
 * A new visitor's demo: first clears out expired demos (so the cap counts
 * only live ones, and the daily cron has less to do), then checks the cap.
 */
export async function startDemo(visitorName: string, now: Date = new Date()): Promise<StartDemoResult> {
  await deleteExpiredDemos(now);
  if ((await countActiveDemos(now)) >= MAX_ACTIVE_DEMOS) {
    return { ok: false, reason: "FULL", message: DEMO_FULL_MESSAGE };
  }
  return { ok: true, ...(await createDemoGroup(visitorName, { now })) };
}

export type ResetDemoResult = ({ ok: true } & CreatedDemo) | { ok: false; reason: "NOT_DEMO"; message: string };

/**
 * "Reset demo": deletes this demo and builds a fresh one for the same
 * visitor name (new link, folded slip, nothing revealed). Refuses a real
 * group.
 */
export async function resetDemo(groupId: string, visitorName: string, now: Date = new Date()): Promise<ResetDemoResult> {
  if (!(await deleteDemoGroup(groupId))) {
    return { ok: false, reason: "NOT_DEMO", message: "Demo group lang ang puwedeng i-reset." };
  }
  return { ok: true, ...(await createDemoGroup(visitorName, { now })) };
}
