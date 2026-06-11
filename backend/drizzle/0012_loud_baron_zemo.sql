ALTER TABLE "users" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_slug_unique" UNIQUE("slug");