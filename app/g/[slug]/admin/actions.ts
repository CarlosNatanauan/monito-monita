"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { track } from "@/server/analytics";
import { getCurrentOrganizer, isValidSlug, personalLinkPath } from "@/server/auth";
import { drawNames, type DrawMode } from "@/server/draw-service";
import { addExclusion, removeExclusion } from "@/server/exclusions";
import { createGroupFormValues, updateGroupDetails } from "@/server/groups";
import { reissueMemberLink, removeMember } from "@/server/members";
import { unlockMemberPin } from "@/server/pin";

export type ActionResult =
  | { ok: true; removed?: "removed" | "patched" | "redrawn" }
  | { ok: false; message: string; needsRedraw?: boolean };

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
      // How it went (for the line at the top of the list), never who drew whom.
      if (result.ok) return { ok: true, removed: result.mode };
      return { ok: false, message: result.message, needsRedraw: result.reason === "NEEDS_REDRAW" };
    },
  );
}

export type ReissueLinkResult = { ok: true; path: string } | { ok: false; message: string };

/**
 * "Get new link" for a member who lost theirs. Their old link, cookie, and
 * every device they came back on stop working. With `resetPin`, their PIN
 * is cleared too and they set a new one after opening the link.
 * Returns only the new personal-link path: no codename, no pairs.
 * Refreshes so the list shows "New link · not opened yet".
 */
export async function reissueMemberLinkAction(input: {
  slug: string;
  memberId: string;
  resetPin?: boolean;
}): Promise<ReissueLinkResult> {
  const parsed = z.object({ slug: slugField, memberId: z.uuid(), resetPin: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Hindi ma-process ang request." };
  const organizer = await getCurrentOrganizer(parsed.data.slug);
  if (!organizer) return { ok: false, message: NOT_ORGANIZER };
  try {
    const result = await reissueMemberLink(organizer.groupId, parsed.data.memberId, {
      resetPin: parsed.data.resetPin,
    });
    if (!result.ok) return { ok: false, message: result.message };
    refresh();
    return { ok: true, path: personalLinkPath("member", parsed.data.slug, result.token) };
  } catch (error) {
    console.error("reissueMemberLinkAction failed", error);
    return { ok: false, message: "Hindi nakagawa ng bagong link. Subukan ulit in a bit." };
  }
}

/** "Unlock" on "Na-lock ang PIN ni …": clears the lock and the wrong-try count. */
export async function unlockPinAction(input: { slug: string; memberId: string }): Promise<ActionResult> {
  return asOrganizer(
    z.object({ slug: slugField, memberId: z.uuid() }),
    input,
    "Hindi na-unlock. Subukan ulit in a bit.",
    async (groupId, { memberId }) =>
      (await unlockMemberPin(groupId, memberId)) ? { ok: true } : { ok: false, message: "Wala na ang member na 'yan." },
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
      if (result.ok) track("names_drawn", groupId, { members: result.count, redraw: mode === "redraw" });
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

/**
 * "Copy reminder" was tapped: analytics only (the kind of message, nothing
 * else). No refresh, and it never fails visibly.
 */
export async function reminderCopiedAction(input: { slug: string; kind: "invite" | "drawn" | "theme" }): Promise<void> {
  const parsed = z.object({ slug: slugField, kind: z.enum(["invite", "drawn", "theme"]) }).safeParse(input);
  if (!parsed.success) return;
  const organizer = await getCurrentOrganizer(parsed.data.slug);
  if (organizer) track("reminder_copied", organizer.groupId, { kind: parsed.data.kind });
}

export type DetailsState =
  | { status: "idle" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string; fieldErrors: Record<string, string> };

/**
 * "Edit details": the same fields and validation as creating a group.
 * Before the draw everything; after it the date and themes only (the
 * server keeps the stored name and budget whatever is posted).
 */
export async function updateDetailsAction(_previous: DetailsState, formData: FormData): Promise<DetailsState> {
  const slug = formData.get("slug");
  if (typeof slug !== "string" || !isValidSlug(slug)) {
    return { status: "error", message: "Hindi ma-process ang request.", fieldErrors: {} };
  }
  const organizer = await getCurrentOrganizer(slug);
  if (!organizer) return { status: "error", message: NOT_ORGANIZER, fieldErrors: {} };

  let result;
  try {
    result = await updateGroupDetails(organizer.groupId, createGroupFormValues(formData));
  } catch (error) {
    console.error("updateDetailsAction failed", error);
    return { status: "error", message: "Hindi na-save. Subukan ulit in a bit.", fieldErrors: {} };
  }
  if (!result.ok) {
    if (result.reason === "INVALID") {
      return { status: "error", message: "May kulang o mali. Pakicheck sa baba.", fieldErrors: result.fieldErrors };
    }
    return { status: "error", message: result.message, fieldErrors: {} };
  }
  refresh();
  return { status: "saved", at: Date.now() };
}
