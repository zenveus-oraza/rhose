ALTER TABLE "quizzes" ADD COLUMN "is_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "max_attempts" integer;