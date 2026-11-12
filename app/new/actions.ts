"use server";

import { track } from "@/server/analytics";
import { setAuthCookie } from "@/server/auth";
import { createGroup, createGroupFormValues, validateCreateGroup } from "@/server/groups";
import { allowRequest, clientIp, RATE_LIMITED_MESSAGE } from "@/server/rate-limit";

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

  if (!(await allowRequest("create", await clientIp()))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE, fieldErrors: {} };
  }

  try {
    const { groupId, slug, organizerToken } = await createGroup(validation.data);
    await setAuthCookie("organizer", slug, organizerToken);
    track("group_created", groupId, { themes: validation.data.themes.length });
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
