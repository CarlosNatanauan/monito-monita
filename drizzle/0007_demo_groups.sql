ALTER TABLE "groups" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "demo_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "groups_demo_expires_idx" ON "groups" USING btree ("demo_expires_at") WHERE "groups"."is_demo";--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_demo_expiry" CHECK ("groups"."is_demo" = ("groups"."demo_expires_at" is not null));