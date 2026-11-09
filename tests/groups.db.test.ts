/**
 * createGroup against the DEV database (`npm run test:db`). createGroup runs
 * its own transaction, so this test deletes its group afterwards (cascades
 * remove the theme weeks). Never point this at production.
 */
import { asc, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { findOrganizerByToken, hashToken, isWellFormedToken } from "@/server/auth";
import { closeDb, db } from "@/server/db";
import { groups, themeWeeks } from "@/server/db/schema";
import { createGroup } from "@/server/groups";

const created: string[] = [];

afterAll(async () => {
  for (const slug of created) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("createGroup (dev DB)", () => {
  it("creates the group, its theme weeks, and an organizer token in one go", async () => {
    const { slug, organizerToken } = await createGroup({
      name: "Smoke test party",
      budget: 300,
      partyDate: "2026-12-19",
      themes: ["Something soft", "Something sweet", "Something red"],
    });
    created.push(slug);

    expect(isWellFormedToken(organizerToken)).toBe(true);

    const [group] = await db().select().from(groups).where(eq(groups.slug, slug));
    expect(group).toMatchObject({ name: "Smoke test party", budget: 300, partyDate: "2026-12-19", status: "OPEN", timezone: "Asia/Manila" });
    // Only the hash is stored, never the raw token.
    expect(group.organizerTokenHash).toBe(hashToken(organizerToken));
    expect(JSON.stringify(group)).not.toContain(organizerToken);

    const weeks = await db()
      .select({ title: themeWeeks.title, startDate: themeWeeks.startDate, position: themeWeeks.position })
      .from(themeWeeks)
      .where(eq(themeWeeks.groupId, group.id))
      .orderBy(asc(themeWeeks.position));
    expect(weeks).toEqual([
      { title: "Something soft", startDate: "2026-11-28", position: 0 },
      { title: "Something sweet", startDate: "2026-12-05", position: 1 },
      { title: "Something red", startDate: "2026-12-12", position: 2 },
    ]);

    // The organizer token works for this group only.
    expect(await findOrganizerByToken(slug, organizerToken)).toEqual({ groupId: group.id, slug });
    expect(await findOrganizerByToken(slug, organizerToken.replace(/.$/, (c) => (c === "A" ? "B" : "A")))).toBeNull();
  });
});
