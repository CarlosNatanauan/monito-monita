"use server";

import { setAuthCookie } from "@/server/auth";
import { createGroup, createGroupFormValues, validateCreateGroup } from "@/server/groups";

export type CreateGroupState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors: Record<string, string> }
  | { status: "success"; groupName: string; slug: string; organizerToken: string };

export async function createGroupAction(
  _previous: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const validation = validateCreateGroup(createGroupFormValues(formData));
  if (!validation.ok) {
    return { status: "error", message: "May kulang o mali sa form. Pakicheck sa baba.", fieldErrors: validation.fieldErrors };
  }

  try {
    const { slug, organizerToken } = await createGroup(validation.data);
    await setAuthCookie("organizer", slug, organizerToken);
    return { status: "success", groupName: validation.data.name, slug, organizerToken };
  } catch (error) {
    console.error("createGroupAction failed", error);
    return {
      status: "error",
      message: "Hindi na-save ang group. Subukan ulit in a bit.",
      fieldErrors: {},
    };
  }
}
