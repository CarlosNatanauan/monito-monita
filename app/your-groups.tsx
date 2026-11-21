"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Listahan } from "@/components/ui/paper";
import { groupsSnapshot, parseGroups, readGroups, subscribeGroups, writeGroups } from "@/lib/your-groups";
import { checkGroupsAction } from "./actions";

const serverSnapshot = () => "[]";

/**
 * "Your groups" on the home page: groups this device created or joined,
 * from localStorage (no tokens), on a listahan. Groups that no longer
 * exist are dropped.
 */
export function YourGroups({ className }: { className?: string }) {
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
    <Listahan title="Your groups" titleId="your-groups" className={className} role="region">
      <ul>
        {groups.map((g) => (
          <li key={g.slug} className="lst-row">
            <Link
              href={g.roles.includes("organizer") ? `/g/${g.slug}/admin` : `/g/${g.slug}/me`}
              className="flex min-h-10 min-w-0 items-center rounded-paper font-bold underline decoration-[1.5px] underline-offset-[3px] focus-ring"
            >
              {/* Long names wrap to two rows at most (the notebook's rule). */}
              <span className="lst-wrap line-clamp-2">Continue: {g.name}</span>
            </Link>
            <span className="lst-wrap shrink-0 self-start text-small text-ube-soft">{g.roles.join(", ")}</span>
          </li>
        ))}
      </ul>
    </Listahan>
  );
}
