"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentOrganizer, isValidSlug } from "@/server/auth";
import { removeMember } from "@/server/members";

const removeSchema = z.object({
  slug: z.string().refine(isValidSlug),
  memberId: z.uuid(),
});

export type RemoveMemberResult = { ok: true } | { ok: false; message: string };

/** Organizer-only: removes a member before the draw. */
export async function removeMemberAction(input: { slug: string; memberId: string }): Promise<RemoveMemberResult> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Hindi ma-process ang request." };

  // Re-check the organizer cookie here; never trust the page that called us.
  const organizer = await getCurrentOrganizer(parsed.data.slug);
  if (!organizer) return { ok: false, message: "Para sa organizer lang ito. Buksan ulit ang organizer link mo." };

  try {
    const result = await removeMember(organizer.groupId, parsed.data.memberId);
    if (!result.ok) return { ok: false, message: result.message };
  } catch (error) {
    console.error("removeMemberAction failed", error);
    return { ok: false, message: "Hindi natanggal. Subukan ulit in a bit." };
  }

  refresh();
  return { ok: true };
}
