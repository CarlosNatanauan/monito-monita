"use client";

import { useEffect } from "react";
import { forgetRole, rememberGroup, type GroupRole } from "@/lib/your-groups";

/**
 * Keeps the device's "Your groups" list (home page) in step with what this
 * page knows: remember the group for a role, or forget a role this device
 * no longer has. Renders nothing.
 */
export function RememberGroup({
  slug,
  name,
  role,
  forget = false,
}: {
  slug: string;
  name: string;
  role: GroupRole;
  forget?: boolean;
}) {
  useEffect(() => {
    if (forget) forgetRole(slug, role);
    else rememberGroup(slug, name, role);
  }, [slug, name, role, forget]);
  return null;
}
