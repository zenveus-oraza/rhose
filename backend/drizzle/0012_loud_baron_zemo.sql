ALTER TABLE "users" ADD COLUMN "slug" varchar(255);
--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "slug" varchar(255);
--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "slug" varchar(255);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "slug" varchar(255);
--> statement-breakpoint
DO $$
DECLARE
  user_record RECORD;
  segment_record RECORD;
  module_record RECORD;
  lesson_record RECORD;
  base_slug text;
  candidate_slug text;
  suffix integer;
BEGIN
  FOR user_record IN SELECT "id", "name" FROM "users" ORDER BY "created_at", "id" LOOP
    base_slug := COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower(trim(user_record."name")), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'user'
    );
    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (SELECT 1 FROM "users" WHERE "slug" = candidate_slug) LOOP
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "users" SET "slug" = candidate_slug WHERE "id" = user_record."id";
  END LOOP;

  FOR segment_record IN SELECT "id", "title" FROM "segments" ORDER BY "created_at", "id" LOOP
    base_slug := COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower(trim(segment_record."title")), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'segment'
    );
    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (SELECT 1 FROM "segments" WHERE "slug" = candidate_slug) LOOP
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "segments" SET "slug" = candidate_slug WHERE "id" = segment_record."id";
  END LOOP;

  FOR module_record IN SELECT "id", "title" FROM "modules" ORDER BY "created_at", "id" LOOP
    base_slug := COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower(trim(module_record."title")), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'module'
    );
    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (SELECT 1 FROM "modules" WHERE "slug" = candidate_slug) LOOP
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "modules" SET "slug" = candidate_slug WHERE "id" = module_record."id";
  END LOOP;

  FOR lesson_record IN SELECT "id", "title" FROM "lessons" ORDER BY "created_at", "id" LOOP
    base_slug := COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower(trim(lesson_record."title")), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'lesson'
    );
    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (SELECT 1 FROM "lessons" WHERE "slug" = candidate_slug) LOOP
      candidate_slug := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "lessons" SET "slug" = candidate_slug WHERE "id" = lesson_record."id";
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "segments" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "modules" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_slug_unique" UNIQUE("slug");
--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_slug_unique" UNIQUE("slug");
--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_slug_unique" UNIQUE("slug");
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_slug_unique" UNIQUE("slug");
