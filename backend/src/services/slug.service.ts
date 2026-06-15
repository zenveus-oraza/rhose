import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';

export function slugifyValue(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function generateUniqueSlug<
  TTable,
  TIdColumn,
  TSlugColumn extends { name?: string }
>(
  table: TTable,
  idColumn: TIdColumn,
  slugColumn: TSlugColumn,
  value: string,
  fallback: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugifyValue(value, fallback);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: idColumn as any })
      .from(table as any)
      .where(
        excludeId
          ? and(eq(slugColumn as any, candidate), ne(idColumn as any, excludeId))
          : eq(slugColumn as any, candidate)
      )
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
