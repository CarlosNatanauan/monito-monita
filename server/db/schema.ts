/**
 * Database schema (Drizzle + Neon Postgres). Source: docs/TECH.md data model.
 *
 * Integrity rules enforced by the database, not just the app:
 * - Group slugs and all token hashes are unique.
 * - Deleting a group cascades to everything in it.
 * - Exclusions and assignments can only reference members of the same
 *   group (composite foreign keys on (group_id, member_id)).
 * - One assignment per giver and one per receiver per group, never self.
 * - Exclusion pairs are stored once, ordered (member_a_id < member_b_id).
 *
 * Message and Guess (nice-to-have) are intentionally not here yet.
 */
import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const groupStatus = pgEnum("group_status", ["OPEN", "DRAWN", "REVEALED"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- Group -----------------------------------------------------------------

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    budget: integer("budget").notNull(), // whole pesos
    partyDate: date("party_date", { mode: "string" }).notNull(), // YYYY-MM-DD in group timezone
    timezone: text("timezone").notNull().default("Asia/Manila"),
    status: groupStatus("status").notNull().default("OPEN"),
    organizerTokenHash: text("organizer_token_hash").notNull().unique(),
    organizationId: uuid("organization_id"), // reserved for future office plans
    createdAt: createdAt(),
  },
  (t) => [check("groups_budget_non_negative", sql`${t.budget} >= 0`)],
);

// --- Member ----------------------------------------------------------------

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    codename: text("codename").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email"), // optional, later
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    // When they first unfolded the slip with their current monito on /me.
    // Cleared when their monito changes (draw, redraw, removal patch), so
    // they unfold the new name. The organizer only ever sees a count.
    slipOpenedAt: timestamp("slip_opened_at", { withTimezone: true }),
  },
  (t) => [
    // Target for composite FKs that keep pairs inside one group.
    unique("members_group_id_id_unique").on(t.groupId, t.id),
    unique("members_group_codename_unique").on(t.groupId, t.codename),
    // No two active members with the same name (case-insensitive).
    // Removed members free up their name.
    uniqueIndex("members_group_active_name_unique")
      .on(t.groupId, sql`lower(${t.displayName})`)
      .where(sql`${t.removedAt} is null`),
  ],
);

// --- Exclusion -------------------------------------------------------------

export const exclusions = pgTable(
  "exclusions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    memberAId: uuid("member_a_id").notNull(),
    memberBId: uuid("member_b_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "exclusions_member_a_fk",
      columns: [t.groupId, t.memberAId],
      foreignColumns: [members.groupId, members.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "exclusions_member_b_fk",
      columns: [t.groupId, t.memberBId],
      foreignColumns: [members.groupId, members.id],
    }).onDelete("cascade"),
    // Store each pair once: the app sorts the two ids before inserting.
    check("exclusions_ordered_pair", sql`${t.memberAId} < ${t.memberBId}`),
    unique("exclusions_pair_unique").on(t.groupId, t.memberAId, t.memberBId),
  ],
);

// --- Assignment ------------------------------------------------------------

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    giverId: uuid("giver_id").notNull(),
    receiverId: uuid("receiver_id").notNull(),
    // Set when a removal after the draw gave this giver a new receiver;
    // shows "Na-update ang monito mo" on /me until they acknowledge it.
    receiverChangedAt: timestamp("receiver_changed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "assignments_giver_fk",
      columns: [t.groupId, t.giverId],
      foreignColumns: [members.groupId, members.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "assignments_receiver_fk",
      columns: [t.groupId, t.receiverId],
      foreignColumns: [members.groupId, members.id],
    }).onDelete("cascade"),
    unique("assignments_group_giver_unique").on(t.groupId, t.giverId),
    unique("assignments_group_receiver_unique").on(t.groupId, t.receiverId),
    check("assignments_no_self_draw", sql`${t.giverId} <> ${t.receiverId}`),
  ],
);

// --- WishlistItem ----------------------------------------------------------

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url"),
    note: text("note"),
    position: integer("position").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("wishlist_items_member_position_idx").on(t.memberId, t.position),
    check("wishlist_items_position_non_negative", sql`${t.position} >= 0`),
  ],
);

// --- ThemeWeek -------------------------------------------------------------

export const themeWeeks = pgTable(
  "theme_weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(), // YYYY-MM-DD in group timezone
    position: integer("position").notNull(),
  },
  (t) => [
    unique("theme_weeks_group_position_unique").on(t.groupId, t.position),
    index("theme_weeks_group_start_date_idx").on(t.groupId, t.startDate),
    check("theme_weeks_position_non_negative", sql`${t.position} >= 0`),
  ],
);

// --- Types -----------------------------------------------------------------

export type GroupStatus = (typeof groupStatus.enumValues)[number];
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type ExclusionRow = typeof exclusions.$inferSelect;
export type AssignmentRow = typeof assignments.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type ThemeWeek = typeof themeWeeks.$inferSelect;
