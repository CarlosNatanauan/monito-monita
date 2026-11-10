"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getMemberSession, isValidSlug } from "@/server/auth";
import { addWish, deleteWish, updateWish, wishSchema } from "@/server/wishlists";

export type WishActionResult = { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const slugField = z.string().refine(isValidSlug);

/** Resolves the member from their own cookie; never from input. */
async function asMember(
  slug: unknown,
  fn: (memberId: string) => Promise<WishActionResult>,
): Promise<WishActionResult> {
  const parsedSlug = slugField.safeParse(slug);
  if (!parsedSlug.success) return { ok: false, message: "Hindi ma-process ang request." };
  const session = await getMemberSession(parsedSlug.data);
  if (session.kind !== "member") return { ok: false, message: "Hindi ka namin kilala sa device na 'to." };
  try {
    const result = await fn(session.member.id);
    if (result.ok) refresh();
    return result;
  } catch (error) {
    console.error("wishlist action failed", error);
    return { ok: false, message: "Hindi na-save. Subukan ulit in a bit." };
  }
}

function parseWish(input: unknown) {
  const parsed = wishSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { ok: false as const, fieldErrors };
}

export async function addWishAction(input: { slug: string; title: string; url?: string; note?: string }) {
  return asMember(input?.slug, async (memberId) => {
    const wish = parseWish(input);
    if (!wish.ok) return { ok: false, message: "Pakicheck ang item.", fieldErrors: wish.fieldErrors };
    return addWish(memberId, wish.data);
  });
}

export async function updateWishAction(input: { slug: string; itemId: string; title: string; url?: string; note?: string }) {
  return asMember(input?.slug, async (memberId) => {
    const id = z.uuid().safeParse(input.itemId);
    if (!id.success) return { ok: false, message: "Hindi ma-process ang request." };
    const wish = parseWish(input);
    if (!wish.ok) return { ok: false, message: "Pakicheck ang item.", fieldErrors: wish.fieldErrors };
    return updateWish(memberId, id.data, wish.data);
  });
}

export async function deleteWishAction(input: { slug: string; itemId: string }) {
  return asMember(input?.slug, async (memberId) => {
    const id = z.uuid().safeParse(input.itemId);
    if (!id.success) return { ok: false, message: "Hindi ma-process ang request." };
    return deleteWish(memberId, id.data);
  });
}
