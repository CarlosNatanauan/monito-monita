/**
 * Seeds groups straight into the DEV database (.env.local), through the
 * same server functions the app uses, so a spec can start from any stage
 * without clicking through the earlier ones. Groups are named "E2E …" and
 * deleted by the spec (and by the global teardown as a safety net).
 */
import { addDays, SAMPLE_THEMES, todayIn } from "../lib/theme-weeks";
import { drawNames, markSlipOpened } from "../server/draw-service";
import { addExclusion } from "../server/exclusions";
import { createGroup } from "../server/groups";
import { joinGroup } from "../server/members";
import { addWish, wishSchema } from "../server/wishlists";
import { E2E_PREFIX } from "./db-cleanup";

export interface SeededMember {
  id: string;
  name: string;
  codename: string;
  /** The personal link's path (`/g/{slug}/me?t=…`): opening it logs a browser in. */
  link: string;
}

export interface SeededGroup {
  slug: string;
  groupId: string;
  name: string;
  partyDate: string;
  /** `/g/{slug}` */
  sharePath: string;
  /** `/g/{slug}/admin?t=…` */
  organizerPath: string;
  members: Record<string, SeededMember>;
}

export interface SeedOptions {
  name: string;
  people: string[];
  budget?: number;
  /** Days from today (Manila). Default 40. */
  partyInDays?: number;
  /** Theme titles. Default: the four sample themes. */
  themes?: readonly string[];
  /** Wishlist titles per person. */
  wishes?: Record<string, { title: string; url?: string; note?: string }[]>;
  /** Pairs of names that can't draw each other. */
  exclusions?: [string, string][];
  draw?: boolean;
  /** After the draw: these people have already unfolded their slip. */
  opened?: string[];
}

export async function seedGroup(options: SeedOptions, track: string[]): Promise<SeededGroup> {
  const partyDate = addDays(todayIn("Asia/Manila"), options.partyInDays ?? 40);
  const name = `${E2E_PREFIX}${options.name}`;
  const created = await createGroup({
    name,
    budget: options.budget ?? 500,
    partyDate,
    themes: [...(options.themes ?? SAMPLE_THEMES)],
  });
  track.push(created.slug);

  const members: Record<string, SeededMember> = {};
  for (const person of options.people) {
    const joined = await joinGroup(created.slug, person, "1234");
    if (!joined.ok) throw new Error(`${person}: ${joined.message}`);
    members[person] = {
      id: joined.memberId,
      name: person,
      codename: joined.codename,
      link: `/g/${created.slug}/me?t=${joined.token}`,
    };
  }

  for (const [person, items] of Object.entries(options.wishes ?? {})) {
    for (const item of items) {
      const added = await addWish(members[person].id, wishSchema.parse(item));
      if (!added.ok) throw new Error(`wish for ${person}: ${added.message}`);
    }
  }

  for (const [a, b] of options.exclusions ?? []) {
    const added = await addExclusion(created.groupId, members[a].id, members[b].id);
    if (!added.ok) throw new Error(`exclusion ${a}/${b}: ${added.message}`);
  }

  if (options.draw) {
    const drawn = await drawNames(created.groupId, "draw");
    if (!drawn.ok) throw new Error(drawn.message);
    for (const person of options.opened ?? []) await markSlipOpened(members[person].id);
  }

  return {
    slug: created.slug,
    groupId: created.groupId,
    name,
    partyDate,
    sharePath: `/g/${created.slug}`,
    organizerPath: `/g/${created.slug}/admin?t=${created.organizerToken}`,
    members,
  };
}
