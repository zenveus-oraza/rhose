CREATE TABLE "segment_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	"access_duration_days" integer,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "segment_assignments_user_id_segment_id_unique" UNIQUE("user_id","segment_id")
);
--> statement-breakpoint
ALTER TABLE "segment_assignments" ADD CONSTRAINT "segment_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_assignments" ADD CONSTRAINT "segment_assignments_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE restrict ON UPDATE no action;