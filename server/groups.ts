/**
 * Group business rules: validation and creation.
 */
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { addDays, DEFAULT_TIMEZONE, isIsoDate, MAX_THEMES, themeStartDates, todayIn } from "@/lib/theme-weeks";
import { createToken, hashToken } from "./auth";
import { db } from "./db";
import { groups, themeWeeks } from "./db/schema";

export const LIMITS = {
  nameMax: 60,
  themeMax: 60,
  budgetMin: 1,
  budgetMax: 100_000,
  partyMaxDaysAhead: 366,
} as const;

// --- Slugs ---------------------------------------------------------------

// No l/1/o/0 so links read clearly if someone has to type one.
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // 32 chars → 5 bits each
export const SLUG_LENGTH = 12; // 60 bits: unguessable for share links

/** A random, unguessable, URL-friendly group slug. */
export function createSlug(): string {
  // 256 is a multiple of 32, so `byte % 32` has no bias.
  return Array.from(randomBytes(SLUG_LENGTH), (byte) => SLUG_ALPHABET[byte % 32]).join("");
}

// --- Validation ----------------------------------------------------------

/**
 * Create-group input schema. `today` is the current date in Manila
 * (injectable for tests); the party can't be in the past or > 1 year out.
 */
export function createGroupSchema(today: string = todayIn(DEFAULT_TIMEZONE)) {
  const latest = addDays(today, LIMITS.partyMaxDaysAhead);
  return z.object({
    name: z
      .string({ error: "Pakilagay ang pangalan ng group." })
      .trim()
      .min(1, "Pakilagay ang pangalan ng group.")
      .max(LIMITS.nameMax, `Hanggang ${LIMITS.nameMax} characters lang.`),
    budget: z.coerce
      .number({ error: "Pakilagay ang budget." })
      .int("Buong piso lang, walang centavo.")
      .min(LIMITS.budgetMin, "Pakilagay ang budget (₱1 pataas).")
      .max(LIMITS.budgetMax, "Hanggang ₱100,000 lang ang budget."),
    partyDate: z
      .string({ error: "Pakipili ang party date." })
      .refine(isIsoDate, "Pakipili ang party date.")
      .refine((d) => d >= today, "Dapat ngayon o sa susunod na araw ang party.")
      .refine((d) => d <= latest, "Masyadong malayo pa ang party date (max 1 year)."),
    themes: z
      .array(
        z
          .string({ error: "Hindi puwedeng blangko ang theme." })
          .trim()
          .min(1, "Hindi puwedeng blangko ang theme.")
          .max(LIMITS.themeMax, `Hanggang ${LIMITS.themeMax} characters lang.`),
      )
      .max(MAX_THEMES, `Hanggang ${MAX_THEMES} themes lang.`),
  });
}

export type CreateGroupInput = z.infer<ReturnType<typeof createGroupSchema>>;

export type ValidationResult =
  | { ok: true; data: CreateGroupInput }
  | { ok: false; fieldErrors: Record<string, string> };

/** Validates raw input. Field errors are keyed by path, e.g. "themes.2". */
export function validateCreateGroup(raw: unknown, today?: string): ValidationResult {
  const result = createGroupSchema(today).safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}

/** Pulls create-group fields out of a form submission. */
export function createGroupFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    budget: formData.get("budget"),
    partyDate: formData.get("partyDate"),
    themes: formData.getAll("theme"),
  };
}

// --- Creation ------------------------------------------------------------

export interface CreatedGroup {
  slug: string;
  /** Raw organizer token: shown once to the creator, never stored. */
  organizerToken: string;
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = error as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
  const code = e.cause?.code ?? e.code;
  const name = e.cause?.constraint ?? e.constraint;
  return code === "23505" && name === constraint;
}

/**
 * Creates the group and its theme weeks in one transaction. Theme start
 * dates are computed here from the party date.
 */
export async function createGroup(input: CreateGroupInput): Promise<CreatedGroup> {
  const organizerToken = createToken();
  const startDates = themeStartDates(input.partyDate, input.themes.length);

  for (let attempt = 1; ; attempt++) {
    const slug = createSlug();
    try {
      await db().transaction(async (tx) => {
        const [group] = await tx
          .insert(groups)
          .values({
            slug,
            name: input.name,
            budget: input.budget,
            partyDate: input.partyDate,
            timezone: DEFAULT_TIMEZONE,
            organizerTokenHash: hashToken(organizerToken),
          })
          .returning({ id: groups.id });

        if (input.themes.length > 0) {
          await tx.insert(themeWeeks).values(
            input.themes.map((title, position) => ({
              groupId: group.id,
              title,
              startDate: startDates[position],
              position,
            })),
          );
        }
      });
      return { slug, organizerToken };
    } catch (error) {
      // A slug collision is astronomically unlikely, but retry just in case.
      if (attempt < 3 && isUniqueViolation(error, "groups_slug_unique")) continue;
      throw error;
    }
  }
}
