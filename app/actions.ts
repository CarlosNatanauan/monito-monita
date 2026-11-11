"use server";

import { z } from "zod";
import { isValidSlug } from "@/server/auth";
import { getGroupNames, MAX_REMEMBERED_GROUPS } from "@/server/groups";

const slugsSchema = z.array(z.string().refine(isValidSlug)).max(MAX_REMEMBERED_GROUPS);

/**
 * For the home page's "Your groups": which of these groups still exist,
 * with their current names. Public info only (the join page shows it too).
 */
export async function checkGroupsAction(slugs: unknown): Promise<{ slug: string; name: string }[] | null> {
  const parsed = slugsSchema.safeParse(slugs);
  if (!parsed.success) return null;
  try {
    return await getGroupNames(parsed.data);
  } catch (error) {
    console.error("checkGroupsAction failed", error);
    return null; // keep the list as is; try again next visit
  }
}
