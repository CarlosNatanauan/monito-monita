"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { track } from "@/server/analytics";
import { getCurrentOrganizer, isValidSlug } from "@/server/auth";
import { moveReveal, startReveal, type RevealResult } from "@/server/reveal";

export type RevealActionResult = { ok: true } | { ok: false; message: string };

const NOT_ORGANIZER = "Para sa organizer lang ito. Buksan ulit ang organizer link mo.";
const slugField = z.string().refine(isValidSlug);

/** Re-checks the organizer cookie, runs `fn`, refreshes the screen. */
async function asOrganizer(
  slug: unknown,
  fn: (groupId: string) => Promise<RevealResult>,
  onChanged: (groupId: string, result: Extract<RevealResult, { ok: true }>) => void,
): Promise<RevealActionResult> {
  const parsed = slugField.safeParse(slug);
  if (!parsed.success) return { ok: false, message: "Hindi ma-process ang request." };
  const organizer = await getCurrentOrganizer(parsed.data);
  if (!organizer) return { ok: false, message: NOT_ORGANIZER };
  let result: RevealResult;
  try {
    result = await fn(organizer.groupId);
  } catch (error) {
    console.error("reveal action failed", error);
    return { ok: false, message: "Hindi gumana. Subukan ulit." };
  }
  // Refresh even when nothing changed, so a stale screen catches up.
  refresh();
  if (!result.ok) return { ok: false, message: result.message };
  if (result.changed) onChanged(organizer.groupId, result);
  return { ok: true };
}

/** "Start the reveal": the first pair goes on screen; redraws and removals lock. */
export async function startRevealAction(input: { slug: string }): Promise<RevealActionResult> {
  return asOrganizer(input?.slug, startReveal, (groupId) => track("reveal_started", groupId, {}));
}

/**
 * Next / Previous. `fromStep` is the step this screen shows; if another
 * device already moved, this one just catches up.
 */
export async function moveRevealAction(input: {
  slug: string;
  fromStep: number;
  move: "next" | "previous";
}): Promise<RevealActionResult> {
  const parsed = z
    .object({ fromStep: z.number().int().min(0).max(1000), move: z.enum(["next", "previous"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Hindi ma-process ang request." };
  const { fromStep, move } = parsed.data;
  return asOrganizer(
    input.slug,
    (groupId) => moveReveal(groupId, fromStep, move),
    (groupId, result) => {
      if (result.status === "REVEALED") track("reveal_finished", groupId, {});
    },
  );
}

export type RevealFormState = { error: string | null };

/**
 * Form version of Next / Previous (the submit button's name/value says
 * which). A form action still runs if tapped before the page hydrates.
 */
export async function moveRevealFormAction(_previous: RevealFormState, formData: FormData): Promise<RevealFormState> {
  const result = await moveRevealAction({
    slug: String(formData.get("slug") ?? ""),
    fromStep: Number(formData.get("fromStep")),
    move: formData.get("move") === "previous" ? "previous" : "next",
  });
  return { error: result.ok ? null : result.message };
}
