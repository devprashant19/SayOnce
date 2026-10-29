CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"relationship" text DEFAULT '' NOT NULL,
	"language" text NOT NULL,
	"channel" text NOT NULL,
	"phone" text,
	"email" text,
	"formality" text NOT NULL,
	"cares_about" text DEFAULT '' NOT NULL,
	"never_tell" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"learned_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"profile_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "demo_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"day" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY NOT NULL,
	"update_id" text NOT NULL,
	"text" text NOT NULL,
	"type" text NOT NULL,
	"values" jsonb NOT NULL,
	"source_span_start" integer NOT NULL,
	"source_span_end" integer NOT NULL,
	"blocked_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_reason" text DEFAULT '' NOT NULL,
	"commitment_owner" text,
	"commitment_due" text,
	"commitment_status" text
);
--> statement-breakpoint
CREATE TABLE "lab_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	"grader_temperature" real NOT NULL,
	"case_count" integer NOT NULL,
	"scores" jsonb NOT NULL,
	"per_case" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"passed" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"update_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"used_fact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sentences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"check_ok" boolean,
	"check_failures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tone_score" real,
	"verify_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overridden" boolean DEFAULT false NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"edited_by_user" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"update_id" text NOT NULL,
	"seq" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"type" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "updates" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"spoken_on" text NOT NULL,
	"time_zone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"project" text DEFAULT '' NOT NULL,
	"raw_text" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"elapsed_seconds" integer
);
--> statement-breakpoint
CREATE INDEX "contacts_dataset_idx" ON "contacts" USING btree ("dataset");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_usage_session_day_idx" ON "demo_usage" USING btree ("session_id","day");--> statement-breakpoint
CREATE INDEX "facts_update_idx" ON "facts" USING btree ("update_id");--> statement-breakpoint
CREATE INDEX "messages_update_idx" ON "messages" USING btree ("update_id");--> statement-breakpoint
CREATE INDEX "messages_contact_idx" ON "messages" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trail_update_seq_idx" ON "trail_entries" USING btree ("update_id","seq");--> statement-breakpoint
CREATE INDEX "updates_dataset_created_idx" ON "updates" USING btree ("dataset","created_at");