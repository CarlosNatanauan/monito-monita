"use server";

import { redirect } from "next/navigation";
import { setAuthCookie } from "@/server/auth";
import { joinGroup, joinSchema, NAME_MAX } from "@/server/members";

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string; nameError: boolean; displayName: string };

export async function joinAction(_previous: JoinState, formData: FormData): Promise<JoinState> {
  const raw = formData.get("displayName");
  // Echoed back so the form keeps what was typed (capped; it's only display).
  const displayName = typeof raw === "string" ? raw.slice(0, NAME_MAX * 2) : "";

  const parsed = joinSchema.safeParse({ slug: formData.get("slug"), displayName: raw });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: "error", message: issue.message, nameError: issue.path[0] === "displayName", displayName };
  }

  const { slug } = parsed.data;
  let result;
  try {
    result = await joinGroup(slug, parsed.data.displayName);
  } catch (error) {
    console.error("joinAction failed", error);
    return { status: "error", message: "Hindi ka namin naisali. Subukan ulit in a bit.", nameError: false, displayName };
  }
  if (!result.ok) {
    return { status: "error", message: result.message, nameError: result.reason === "DUPLICATE_NAME", displayName };
  }

  await setAuthCookie("member", slug, result.token);
  // /me shows the personal link with a "Save this link" message.
  redirect(`/g/${slug}/me?welcome=1`);
}
