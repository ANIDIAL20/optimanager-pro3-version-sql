CREATE TABLE IF NOT EXISTS "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"opening_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"closing_balance" numeric(10, 2),
	"expected_balance" numeric(10, 2),
	"difference" numeric(10, 2),
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text,
	"closed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_sessions_user_id_idx" ON "cash_sessions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_sessions_status_idx" ON "cash_sessions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_sessions_opened_at_idx" ON "cash_sessions" ("opened_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_cash_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_movements_user_id_idx" ON "cash_movements" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_movements_session_id_idx" ON "cash_movements" ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_movements_created_at_idx" ON "cash_movements" ("created_at");
