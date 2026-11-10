/**
 * Wishlists. Each member edits only their own list; after the draw a
 * member can read only their own receiver's list (getReceiverWishlist).
 */
import { and, asc, count, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { assignments, members, wishlistItems } from "./db/schema";
import {
  displayDomain,
  normalizeWishUrl,
  WISH_NOTE_MAX,
  WISH_TITLE_MAX,
  WISH_URL_MAX,
  WISHLIST_MAX_ITEMS,
} from "@/lib/wish";

export { displayDomain, normalizeWishUrl, WISH_NOTE_MAX, WISH_TITLE_MAX, WISH_URL_MAX, WISHLIST_MAX_ITEMS };

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(maxLength, message))
    .transform((v) => (v === "" ? null : v));

export const wishSchema = z.object({
  title: z
    .string({ error: "Pakilagay kung ano ang gusto mo." })
    .trim()
    .min(1, "Pakilagay kung ano ang gusto mo.")
    .max(WISH_TITLE_MAX, `Hanggang ${WISH_TITLE_MAX} characters lang.`),
  url: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const raw = (v ?? "").trim();
      if (!raw) return null;
      const url = raw.length <= WISH_URL_MAX ? normalizeWishUrl(raw) : null;
      if (!url) {
        ctx.addIssue({ code: "custom", message: "Hindi valid ang link. Dapat http o https." });
        return z.NEVER;
      }
      return url;
    }),
  note: optionalText(WISH_NOTE_MAX, `Hanggang ${WISH_NOTE_MAX} characters lang ang note.`),
});

export type WishInput = z.infer<typeof wishSchema>;

export interface WishItem {
  id: string;
  title: string;
  url: string | null;
  note: string | null;
}

export type WishResult = { ok: true } | { ok: false; message: string };

/** A member's own list, in order. */
export async function listWishlist(memberId: string): Promise<WishItem[]> {
  return db()
    .select({ id: wishlistItems.id, title: wishlistItems.title, url: wishlistItems.url, note: wishlistItems.note })
    .from(wishlistItems)
    .where(eq(wishlistItems.memberId, memberId))
    .orderBy(asc(wishlistItems.position), asc(wishlistItems.createdAt));
}

export async function addWish(memberId: string, input: WishInput): Promise<WishResult> {
  return db().transaction(async (tx): Promise<WishResult> => {
    // Lock the member row so two quick adds can't exceed the limit.
    const [member] = await tx
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.id, memberId), isNull(members.removedAt)))
      .for("update")
      .limit(1);
    if (!member) return { ok: false, message: "Hindi ka na kasali sa group na 'to." };

    const [{ n, last }] = await tx
      .select({ n: count(), last: max(wishlistItems.position) })
      .from(wishlistItems)
      .where(eq(wishlistItems.memberId, memberId));
    if (n >= WISHLIST_MAX_ITEMS) return { ok: false, message: `Hanggang ${WISHLIST_MAX_ITEMS} items lang ang wishlist.` };

    await tx.insert(wishlistItems).values({ memberId, ...input, position: (last ?? -1) + 1 });
    return { ok: true };
  });
}

export async function updateWish(memberId: string, itemId: string, input: WishInput): Promise<WishResult> {
  const updated = await db()
    .update(wishlistItems)
    .set(input)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.memberId, memberId)))
    .returning({ id: wishlistItems.id });
  return updated.length ? { ok: true } : { ok: false, message: "Wala na ang item na 'yan." };
}

export async function deleteWish(memberId: string, itemId: string): Promise<WishResult> {
  const deleted = await db()
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.memberId, memberId)))
    .returning({ id: wishlistItems.id });
  return deleted.length ? { ok: true } : { ok: false, message: "Wala na ang item na 'yan." };
}

/**
 * The wishlist of the viewer's own receiver (latest version). Pass only
 * the member id verified from the viewer's own cookie.
 */
export async function getReceiverWishlist(giverId: string): Promise<WishItem[]> {
  return db()
    .select({ id: wishlistItems.id, title: wishlistItems.title, url: wishlistItems.url, note: wishlistItems.note })
    .from(assignments)
    .innerJoin(members, and(eq(members.id, assignments.receiverId), isNull(members.removedAt)))
    .innerJoin(wishlistItems, eq(wishlistItems.memberId, assignments.receiverId))
    .where(eq(assignments.giverId, giverId))
    .orderBy(asc(wishlistItems.position), asc(wishlistItems.createdAt));
}
