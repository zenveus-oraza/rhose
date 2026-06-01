import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

/**
 * PostgreSQL connection using the `postgres` package.
 * Uses DATABASE_URL from validated environment config.
 */
const connection = postgres(env.DATABASE_URL);

/**
 * Drizzle ORM instance configured with the PostgreSQL connection and schema.
 * Import this `db` instance in services and other modules for database access.
 */
export const db = drizzle(connection, { schema });

/** Export the raw connection for cases where direct access is needed (e.g., graceful shutdown). */
export { connection };
