"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentOrganizer, isValidSlug } from "@/server/auth";
import { drawNames, type DrawMode } from "@/server/draw-service";
import { addExclusion, removeExclusion } from "@/server/exclusions";
import { removeMember } from "@/server/members";

export type ActionResult = { ok: true } | { ok: false; message: string; needsRedraw?: boolean };

const NOT_ORGANIZER = "Para sa organizer lang ito. Buksan ulit ang organizer link mo.";
const slugField = z.string().refine(isValidSlug);

/**
 * Validates input, re-checks the organizer cookie (never trust the page
 * that called us), runs `fn`, and refreshes the page on success.
 */
async function asOrganizer<T extends { slug: string }>(
  schema: z.ZodType<T>,
  input: unknown,
  failureMessage: string,
  fn: (groupId: string, data: T) => Promise<ActionResult>,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Hindi ma-process ang request." };

  const organizer = await getCurrentOrganizer(parsed.data.slug);
  if (!organizer) return { ok: false, message: NOT_ORGANIZER };

  let result: ActionResult;
  try {
    result = await fn(organizer.groupId, parsed.data);
  } catch (error) {
    console.error("organizer action failed", error);
    return { ok: false, message: failureMessage };
  }
  refresh();
  return result;
}

/**
 * Removes a member. After the draw the loop is patched; if that would
 * pair an excluded couple, `needsRedraw` comes back and the organizer can
 * retry with `redraw: true` (remove + redraw everyone).
 */
export async function removeMemberAction(input: {
  slug: string;
  memberId: string;
  redraw?: boolean;
}): Promise<ActionResult> {
  return asOrganizer(
    z.object({ slug: slugField, memberId: z.uuid(), redraw: z.boolean().optional() }),
    input,
    "Hindi natanggal. Subukan ulit in a bit.",
    async (groupId, { memberId, redraw }) => {
      const result = await removeMember(groupId, memberId, { redraw });
      if (result.ok) return { ok: true };
      return { ok: false, message: result.message, needsRedraw: result.reason === "NEEDS_REDRAW" };
    },
  );
}

/** "These two can't draw each other." */
export async function addExclusionAction(input: {
  slug: string;
  memberAId: string;
  memberBId: string;
}): Promise<ActionResult> {
  return asOrganizer(
    z.object({ slug: slugField, memberAId: z.uuid(), memberBId: z.uuid() }),
    input,
    "Hindi na-save ang pair. Subukan ulit in a bit.",
    (groupId, { memberAId, memberBId }) => addExclusion(groupId, memberAId, memberBId),
  );
}

/**
 * Draw names, or redraw before the reveal. A second click (or tab) that
 * arrives after the first draw sees "already drawn" and is treated as done.
 */
export async function drawNamesAction(input: { slug: string; mode: DrawMode }): Promise<ActionResult> {
  return asOrganizer(
    z.object({ slug: slugField, mode: z.enum(["draw", "redraw"]) }),
    input,
    "Hindi natuloy ang draw. Subukan ulit in a bit.",
    async (groupId, { mode }) => {
      const result = await drawNames(groupId, mode);
      if (result.ok || result.reason === "ALREADY_DRAWN") return { ok: true };
      return { ok: false, message: result.message };
    },
  );
}

export async function removeExclusionAction(input: { slug: string; exclusionId: string }): Promise<ActionResult> {
  return asOrganizer(
    z.object({ slug: slugField, exclusionId: z.uuid() }),
    input,
    "Hindi natanggal ang pair. Subukan ulit in a bit.",
    (groupId, { exclusionId }) => removeExclusion(groupId, exclusionId),
  );
}
