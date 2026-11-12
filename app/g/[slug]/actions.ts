"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isValidSlug, setAuthCookie } from "@/server/auth";
import { joinGroup, joinSchema, NAME_MAX } from "@/server/members";
import { COME_BACK_FAILED, comeBack } from "@/server/pin";
import { allowRequest, clientIp, RATE_LIMITED_MESSAGE, recordFailure } from "@/server/rate-limit";

export type JoinState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      field: "displayName" | "pin" | null;
      displayName: string;
    }
  // The name is in the group already: show the come-back form (PIN only).
  | { status: "taken"; message: string; displayName: string };

/** Echoed back so the form keeps what was typed (capped; it's only display). */
function echoName(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw.slice(0, NAME_MAX * 2) : "";
}

export async function joinAction(_previous: JoinState, formData: FormData): Promise<JoinState> {
  const raw = formData.get("displayName");
  const displayName = echoName(raw);

  const parsed = joinSchema.safeParse({ slug: formData.get("slug"), displayName: raw, pin: formData.get("pin") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path[0] === "displayName" || issue.path[0] === "pin" ? issue.path[0] : null;
    return { status: "error", message: issue.message, field, displayName };
  }

  const { slug } = parsed.data;
  const ip = await clientIp();
  if (!(await allowRequest("join", ip))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE, field: null, displayName };
  }

  let result;
  try {
    result = await joinGroup(slug, parsed.data.displayName, parsed.data.pin);
  } catch (error) {
    console.error("joinAction failed", error);
    return { status: "error", message: "Hindi ka namin naisali. Subukan ulit in a bit.", field: null, displayName };
  }
  if (!result.ok) {
    if (result.reason === "NAME_TAKEN") {
      // Counts toward the IP's failure budget, so names can't be checked in bulk.
      await recordFailure(ip);
      return { status: "taken", message: result.message, displayName };
    }
    return { status: "error", message: result.message, field: null, displayName };
  }

  await setAuthCookie("member", slug, result.token);
  // /me shows the personal link with "Send this link to yourself".
  redirect(`/g/${slug}/me?welcome=1`);
}

/** The come-back form only ever shows one message. */
export type ComeBackState = { status: "idle" } | { status: "error"; message: typeof COME_BACK_FAILED };

const comeBackInput = z.object({
  slug: z.string().refine(isValidSlug),
  displayName: z.string().max(NAME_MAX * 2),
  pin: z.string().max(16),
});

/**
 * Name + PIN on another device. Every failure (bad input, unknown name,
 * wrong PIN, locked, rate limited, after the draw or not) returns the
 * same state, so the response never tells whether a name exists.
 */
export async function comeBackAction(_previous: ComeBackState, formData: FormData): Promise<ComeBackState> {
  const failed: ComeBackState = { status: "error", message: COME_BACK_FAILED };
  const parsed = comeBackInput.safeParse({
    slug: formData.get("slug"),
    displayName: formData.get("displayName"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) return failed;

  const { slug, displayName, pin } = parsed.data;
  const ip = await clientIp();
  if (!(await allowRequest("comeback", ip))) return failed;

  let result;
  try {
    result = await comeBack(slug, displayName, pin.trim());
  } catch (error) {
    console.error("comeBackAction failed", error);
    return failed;
  }
  if (!result.ok) {
    await recordFailure(ip);
    return failed;
  }

  await setAuthCookie("member", slug, result.token);
  redirect(`/g/${slug}/me`);
}
