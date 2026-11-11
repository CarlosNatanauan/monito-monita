"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { groupsSnapshot, parseGroups, readGroups, subscribeGroups, writeGroups } from "@/lib/your-groups";
import { checkGroupsAction } from "./actions";

const serverSnapshot = () => "[]";

/**
 * "Your groups" on the home page: groups this device created or joined,
 * from localStorage (no tokens). Groups that no longer exist are dropped.
 */
export function YourGroups() {
  const raw = useSyncExternalStore(subscribeGroups, groupsSnapshot, serverSnapshot);
  const groups = useMemo(() => parseGroups(raw), [raw]);
  const hasGroups = groups.length > 0;

  // Once per visit: drop deleted groups and pick up renamed ones.
  useEffect(() => {
    if (!hasGroups) return;
    let alive = true;
    const slugs = readGroups().map((g) => g.slug);
    checkGroupsAction(slugs).then((existing) => {
      if (!alive || !existing) return;
      const names = new Map(existing.map((g) => [g.slug, g.name]));
      writeGroups(
        readGroups()
          .filter((g) => names.has(g.slug))
          .map((g) => ({ ...g, name: names.get(g.slug)! })),
      );
    });
    return () => {
      alive = false;
    };
  }, [hasGroups]);

  if (!hasGroups) return null;

  return (
    <section aria-labelledby="your-groups" className="flex flex-col gap-3">
      <h2 id="your-groups" className="text-title">
        Your groups
      </h2>
      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.slug}>
            <Link
              href={g.roles.includes("organizer") ? `/g/${g.slug}/admin` : `/g/${g.slug}/me`}
              className="flex flex-col rounded-xl bg-slip px-4 py-3 shadow-[0_1px_2px_rgb(31_27_77/0.06)] outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              <span className="font-semibold">Continue: {g.name}</span>
              <span className="text-caption text-muted-foreground">{g.roles.join(", ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
