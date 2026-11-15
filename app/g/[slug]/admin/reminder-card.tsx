"use client";

import { useState } from "react";
import { CopyButton, useOrigin } from "@/components/copy-link";
import { FolderTabs } from "@/components/ui/folder-tabs";
import { Bubble, SectionTitle } from "@/components/ui/paper";
import { buildGcReminder, type ReminderInput, type ReminderKind } from "@/lib/reminder";
import { cn } from "@/lib/utils";
import { reminderCopiedAction } from "./actions";

const KINDS: { value: ReminderKind; label: string }[] = [
  { value: "drawn", label: "Na-draw na" },
  { value: "theme", label: "Theme reminder" },
];

/**
 * The GC message, exactly as it will be pasted (a GC bubble), with Copy.
 * After the draw there are two versions, as folder tabs: "Na-draw na!"
 * (the default until most have opened their slip, titled "I-announce sa
 * GC") and the weekly theme reminder ("Paalala para sa GC").
 */
export function ReminderCard({
  slug,
  defaultKind = "theme",
  prominent = false,
  className,
  ...data
}: Omit<ReminderInput, "shareUrl" | "kind"> & {
  slug: string;
  defaultKind?: ReminderKind;
  /** The main action on the page: a filled Copy button. */
  prominent?: boolean;
  className?: string;
}) {
  const origin = useOrigin();
  const [kind, setKind] = useState<ReminderKind>(defaultKind);
  const message = buildGcReminder({ ...data, kind, shareUrl: `${origin}/g/${slug}` });
  const drawn = data.status !== "OPEN";
  const announce = drawn && kind === "drawn";

  return (
    <section aria-labelledby="reminder-title" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <SectionTitle id="reminder-title">{announce ? "I-announce sa GC" : "Paalala para sa GC"}</SectionTitle>
      {drawn && <FolderTabs label="Reminder type" items={KINDS} value={kind} onSelect={setKind} />}
      <Bubble aria-label="Reminder preview">{message}</Bubble>
      <CopyButton
        text={origin ? message : ""}
        label={announce ? "Copy announcement" : "Copy reminder"}
        variant={prominent ? "default" : "secondary"}
        className={prominent ? "w-full lg:w-fit" : "self-start"}
        onCopied={() => void reminderCopiedAction({ slug, kind: drawn ? kind : "invite" }).catch(() => {})}
      />
    </section>
  );
}
