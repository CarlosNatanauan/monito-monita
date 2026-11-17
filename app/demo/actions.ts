"use server";

import { redirect } from "next/navigation";
import { trackDemoStarted } from "@/server/analytics";
import { clearAuthCookie, getCurrentMember, getCurrentOrganizer, isValidSlug, setAuthCookie } from "@/server/auth";
import {
  DEMO_DEFAULT_NAME,
  demoNameSchema,
  resetDemo,
  startDemo,
  type CreatedDemo,
  type ResetDemoResult,
  type StartDemoResult,
} from "@/server/demo";
import { isDemoGroup } from "@/server/groups";
import { allowRequest, clientIp } from "@/server/rate-limit";

/** Why /demo shows an error (`/demo?e=…`). */
export type DemoError = "limit" | "full" | "name" | "failed";

/** The visitor gets both cookies: organizer and their own member. */
async function enter(demo: CreatedDemo): Promise<never> {
  await setAuthCookie("organizer", demo.slug, demo.organizerToken);
  await setAuthCookie("member", demo.slug, demo.memberToken);
  redirect(`/g/${demo.slug}/me`);
}

/**
 * "Simulan ang demo" on /demo: a fresh demo group for this visitor, then
 * their /me with the slip still folded. A plain form action (no client
 * code): errors come back as /demo?e=… so it works before hydration.
 */
export async function startDemoAction(formData: FormData): Promise<void> {
  const name = demoNameSchema.safeParse(formData.get("name") ?? undefined);
  if (!name.success) redirect("/demo?e=name");
  if (!(await allowRequest("demo", await clientIp()))) redirect("/demo?e=limit");

  let result: StartDemoResult | null = null;
  try {
    result = await startDemo(name.data);
  } catch (error) {
    console.error("startDemoAction failed", error);
  }
  if (!result) redirect("/demo?e=failed");
  if (!result.ok) redirect("/demo?e=full");
  const demo = result;
  trackDemoStarted(demo.groupId, { custom_name: name.data !== DEMO_DEFAULT_NAME, reset: false });
  await enter(demo);
}

/**
 * "Reset demo": only the demo's own organizer, only for a demo group.
 * Deletes it and builds a fresh one with the visitor's name (new link,
 * folded slip, nothing revealed).
 */
export async function resetDemoAction(formData: FormData): Promise<void> {
  const slug = formData.get("slug");
  if (typeof slug !== "string" || !isValidSlug(slug)) redirect("/demo");
  const organizer = await getCurrentOrganizer(slug);
  // Gone already (expired, or a double tap that reset it): start over.
  if (!organizer || !(await isDemoGroup(organizer.groupId))) redirect("/demo");
  if (!(await allowRequest("demo", await clientIp()))) redirect("/demo?e=limit");

  const member = await getCurrentMember(slug);
  const visitor = member?.displayName ?? DEMO_DEFAULT_NAME;
  let result: ResetDemoResult | null = null;
  try {
    result = await resetDemo(organizer.groupId, visitor);
  } catch (error) {
    console.error("resetDemoAction failed", error);
  }
  if (!result) redirect("/demo?e=failed");
  if (!result.ok) redirect("/demo");
  const demo = result;
  await clearAuthCookie("organizer", slug);
  await clearAuthCookie("member", slug);
  trackDemoStarted(demo.groupId, { custom_name: visitor !== DEMO_DEFAULT_NAME, reset: true });
  await enter(demo);
}
