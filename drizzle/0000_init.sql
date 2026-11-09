CREATE TYPE "public"."group_status" AS ENUM('OPEN', 'DRAWN', 'REVEALED');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_group_giver_unique" UNIQUE("group_id","giver_id"),
	CONSTRAINT "assignments_group_receiver_unique" UNIQUE("group_id","receiver_id"),
	CONSTRAINT "assignments_no_self_draw" CHECK ("assignments"."giver_id" <> "assignments"."receiver_id")
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"member_a_id" uuid NOT NULL,
	"member_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exclusions_pair_unique" UNIQUE("group_id","member_a_id","member_b_id"),
	CONSTRAINT "exclusions_ordered_pair" CHECK ("exclusions"."member_a_id" < "exclusions"."member_b_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"budget" integer NOT NULL,
	"party_date" date NOT NULL,
	"timezone" text DEFAULT 'Asia/Manila' NOT NULL,
	"status" "group_status" DEFAULT 'OPEN' NOT NULL,
	"organizer_token_hash" text NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug"),
	CONSTRAINT "groups_organizer_token_hash_unique" UNIQUE("organizer_token_hash"),
	CONSTRAINT "groups_budget_non_negative" CHECK ("groups"."budget" >= 0)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"codename" text NOT NULL,
	"token_hash" text NOT NULL,
	"email" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "members_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "members_group_id_id_unique" UNIQUE("group_id","id"),
	CONSTRAINT "members_group_codename_unique" UNIQUE("group_id","codename")
);
--> statement-breakpoint
CREATE TABLE "theme_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "theme_weeks_group_position_unique" UNIQUE("group_id","position"),
	CONSTRAINT "theme_weeks_position_non_negative" CHECK ("theme_weeks"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"note" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_position_non_negative" CHECK ("wishlist_items"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_fk" FOREIGN KEY ("group_id","giver_id") REFERENCES "public"."members"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_fk" FOREIGN KEY ("group_id","receiver_id") REFERENCES "public"."members"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_member_a_fk" FOREIGN KEY ("group_id","member_a_id") REFERENCES "public"."members"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_member_b_fk" FOREIGN KEY ("group_id","member_b_id") REFERENCES "public"."members"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_weeks" ADD CONSTRAINT "theme_weeks_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "theme_weeks_group_start_date_idx" ON "theme_weeks" USING btree ("group_id","start_date");--> statement-breakpoint
CREATE INDEX "wishlist_items_member_position_idx" ON "wishlist_items" USING btree ("member_id","position");