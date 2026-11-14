"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { groupsSnapshot, parseGroups, readGroups, subscribeGroups, writeGroups } from "@/lib/your-groups";
import { checkGroupsAction } from "./actions";

const serverSnapshot = () => "[]";

/**
 * "Your groups" on the home page: groups this device created or joined,
 * from localStorage (no tokens). Groups that no longer exist are dropped.
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
    <section aria-labelledby="your-groups" className={cn("flex flex-col gap-3 rounded-3xl bg-niyog p-5", className)}>
      <h2 id="your-groups" className="text-title font-extrabold">
        Your groups
      </h2>
      <ul className="flex flex-col rows-dashed">
        {groups.map((g) => (
          <li key={g.slug} className="py-1 first:pt-0 last:pb-0">
            <Link
              href={g.roles.includes("organizer") ? `/g/${g.slug}/admin` : `/g/${g.slug}/me`}
              className="-mx-2 flex min-h-12 flex-col justify-center rounded-xl px-2 py-2 focus-ring"
            >
              <span className="font-bold underline underline-offset-4">Continue: {g.name}</span>
              <span className="text-small font-medium text-ube-soft">{g.roles.join(", ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
