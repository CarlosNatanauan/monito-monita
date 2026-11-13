"use client";

import { useState } from "react";
import { CopyButton, useOrigin } from "@/components/copy-link";
import { SegmentedButtons } from "@/components/segmented";
import { buildGcReminder, type ReminderInput, type ReminderKind } from "@/lib/reminder";
import { reminderCopiedAction } from "./actions";

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
  prominent = false,
  ...data
}: Omit<ReminderInput, "shareUrl" | "kind"> & {
  slug: string;
  defaultKind?: ReminderKind;
  /** The main action on the page: a filled Copy button. */
  prominent?: boolean;
}) {
  const origin = useOrigin();
  const [kind, setKind] = useState<ReminderKind>(defaultKind);
  const message = buildGcReminder({ ...data, kind, shareUrl: `${origin}/g/${slug}` });
  const drawn = data.status !== "OPEN";

  return (
    <div className="flex flex-col gap-4">
      {drawn && (
        <SegmentedButtons
          label="Reminder type"
          value={kind}
          options={KINDS.map((k) => ({ value: k.kind, label: k.label }))}
          onChange={setKind}
          className="bg-leaf-wash"
        />
      )}
      <pre
        aria-label="Reminder preview"
        className="rounded-2xl bg-leaf-wash px-5 py-4 font-sans text-body whitespace-pre-wrap break-words"
        translate="no"
      >
        {message}
      </pre>
      <CopyButton
        text={origin ? message : ""}
        label="Copy reminder"
        variant={prominent ? "default" : "secondary"}
        className="w-full"
        onCopied={() => void reminderCopiedAction({ slug, kind: drawn ? kind : "invite" }).catch(() => {})}
      />
    </div>
  );
}
