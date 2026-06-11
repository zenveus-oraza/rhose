ALTER TABLE "users" ADD COLUMN "slug" varchar(255);
--> statement-breakpoint
DO $$
DECLARE
  user_record RECORD;
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
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_slug_unique" UNIQUE("slug");
