CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"percentile" numeric(5, 2) NOT NULL,
	"score_at_alert" integer NOT NULL,
	"comments_at_alert" integer NOT NULL,
	"growth_rate" numeric(10, 2) NOT NULL,
	"detected_at" timestamp NOT NULL,
	"post_age_minutes" integer NOT NULL,
	"is_sent" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "email_digests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sent_at" timestamp NOT NULL,
	"alert_ids" integer[] NOT NULL,
	"alert_count" integer NOT NULL,
	"digest_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "growth_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"age_bucket" text NOT NULL,
	"metric_type" text NOT NULL,
	"p50" numeric(10, 2),
	"p75" numeric(10, 2),
	"p90" numeric(10, 2),
	"p95" numeric(10, 2),
	"p99" numeric(10, 2),
	"sample_size" integer NOT NULL,
	"calculated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"author" text NOT NULL,
	"post_type" text NOT NULL,
	"first_seen_at" timestamp NOT NULL,
	"last_updated_at" timestamp NOT NULL,
	"is_dead" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"score" integer NOT NULL,
	"descendants" integer DEFAULT 0,
	"captured_at" timestamp NOT NULL,
	"minutes_since_creation" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alerts_detected" ON "alerts" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "idx_alerts_sent" ON "alerts" USING btree ("is_sent","detected_at");--> statement-breakpoint
CREATE INDEX "idx_alerts_post" ON "alerts" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_post_alert" ON "alerts" USING btree ("post_id","alert_type");--> statement-breakpoint
CREATE INDEX "idx_digests_sent" ON "email_digests" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_digests_status" ON "email_digests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_benchmarks_calculated" ON "growth_benchmarks" USING btree ("calculated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_benchmark" ON "growth_benchmarks" USING btree ("age_bucket","metric_type");--> statement-breakpoint
CREATE INDEX "idx_posts_first_seen" ON "posts" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX "idx_posts_type" ON "posts" USING btree ("post_type");--> statement-breakpoint
CREATE INDEX "idx_posts_author" ON "posts" USING btree ("author");--> statement-breakpoint
CREATE INDEX "idx_snapshots_post" ON "snapshots" USING btree ("post_id","captured_at");--> statement-breakpoint
CREATE INDEX "idx_snapshots_captured" ON "snapshots" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "idx_snapshots_age" ON "snapshots" USING btree ("minutes_since_creation");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_post_capture" ON "snapshots" USING btree ("post_id","captured_at");