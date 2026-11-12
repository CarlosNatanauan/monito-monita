ALTER TYPE "public"."group_status" ADD VALUE 'REVEALING' BEFORE 'REVEALED';--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "reveal_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_reveal_step_non_negative" CHECK ("groups"."reveal_step" >= 0);