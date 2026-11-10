"use server";

import { redirect } from "next/navigation";
import { setAuthCookie } from "@/server/auth";
import { joinGroup, joinSchema } from "@/server/members";

export type JoinState = { status: "idle" } | { status: "error"; message: string; nameError: boolean };

export async function joinAction(_previous: JoinState, formData: FormData): Promise<JoinState> {
  const parsed = joinSchema.safeParse({ slug: formData.get("slug"), displayName: formData.get("displayName") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: "error", message: issue.message, nameError: issue.path[0] === "displayName" };
  }

  const { slug, displayName } = parsed.data;
  let result;
  try {
    result = await joinGroup(slug, displayName);
  } catch (error) {
    console.error("joinAction failed", error);
    return { status: "error", message: "Hindi ka namin naisali. Subukan ulit in a bit.", nameError: false };
  }
  if (!result.ok) {
    return { status: "error", message: result.message, nameError: result.reason === "DUPLICATE_NAME" };
  }

  await setAuthCookie("member", slug, result.token);
  // /me shows the personal link with a "Save this link" message.
  redirect(`/g/${slug}/me?welcome=1`);
}
