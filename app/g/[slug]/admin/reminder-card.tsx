"use client";

import { useState } from "react";
import { CopyButton, useOrigin } from "@/components/copy-link";
import { buildGcReminder, type ReminderInput, type ReminderKind } from "@/lib/reminder";
import { cn } from "@/lib/utils";

const KINDS: { kind: ReminderKind; label: string }[] = [
  { kind: "drawn", label: "Na-draw na" },
  { kind: "theme", label: "Theme reminder" },
];

/**
 * Preview of the GC reminder, with a Copy button. After the draw there are
 * two versions: "Na-draw na!" (the default until most have opened their
 * slip) and the weekly theme reminder.
 */
export function ReminderCard({
  slug,
  defaultKind = "theme",
  ...data
}: Omit<ReminderInput, "shareUrl" | "kind"> & { slug: string; defaultKind?: ReminderKind }) {
  const origin = useOrigin();
  const [kind, setKind] = useState<ReminderKind>(defaultKind);
  const message = buildGcReminder({ ...data, kind, shareUrl: `${origin}/g/${slug}` });
  const drawn = data.status !== "OPEN";

  return (
    <div className="flex flex-col gap-3">
      {drawn && (
        <div role="group" aria-label="Reminder type" className="flex self-start rounded-full bg-muted p-1 text-caption font-semibold">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              aria-pressed={kind === k.kind}
              onClick={() => setKind(k.kind)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring",
                kind === k.kind ? "bg-slip text-foreground shadow-[0_1px_2px_rgb(31_27_77/0.10)]" : "text-muted-foreground",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      <pre
        aria-label="Reminder preview"
        className="rounded-xl bg-slip p-4 font-sans text-caption whitespace-pre-wrap break-words ring-1 ring-border"
        translate="no"
      >
        {message}
      </pre>
      <CopyButton text={origin ? message : ""} label="Copy reminder" variant="outline" />
    </div>
  );
}
