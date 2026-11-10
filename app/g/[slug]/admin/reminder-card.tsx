"use client";

import { CopyButton, useOrigin } from "@/components/copy-link";
import { buildGcReminder, type ReminderInput } from "@/lib/reminder";

/** Preview of the GC reminder, with a Copy button. */
export function ReminderCard({ slug, ...data }: Omit<ReminderInput, "shareUrl"> & { slug: string }) {
  const origin = useOrigin();
  const message = buildGcReminder({ ...data, shareUrl: `${origin}/g/${slug}` });

  return (
    <div className="flex flex-col gap-3">
      <pre
        aria-label="Reminder preview"
        className="rounded-xl bg-muted p-4 font-sans text-caption whitespace-pre-wrap break-words"
        translate="no"
      >
        {message}
      </pre>
      <CopyButton text={origin ? message : ""} label="Copy reminder" variant="outline" />
    </div>
  );
}
