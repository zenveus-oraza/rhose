import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * Feature: m1-project-setup-core-architecture, Property 14: Schema Migration Round-Trip
 *
 * **Validates: Requirements 6.7, 6.8**
 *
 * Verifies that the generated migration SQL matches the Drizzle schema definitions:
 * - All expected tables are present
 * - All expected enums are present
 * - Foreign key constraints are correctly defined
 * - Key columns exist for each table
 */

const migrationPath = path.resolve(__dirname, '../../drizzle/0000_spotty_ser_duncan.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

describe('Feature: m1-project-setup-core-architecture, Property 14: Schema Migration Round-Trip', () => {
  /**
   * **Validates: Requirements 6.7, 6.8**
   *
   * For all expected tables defined in the Drizzle schema, the migration SQL
   * must contain a CREATE TABLE statement for each one.
   */
  it('migration contains CREATE TABLE statements for all expected tables', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'password_reset_tokens', 'segments', 'modules', 'lessons'),
        (tableName) => {
          const createTableRegex = new RegExp(`CREATE TABLE "${tableName}"`, 'i');
          expect(migrationSQL).toMatch(createTableRegex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.7, 6.8**
   *
   * For all expected enums defined in the Drizzle schema, the migration SQL
   * must contain a CREATE TYPE statement for each one.
   */
  it('migration contains CREATE TYPE statements for all expected enums', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('user_role', 'user_status', 'segment_status', 'lesson_content_type'),
        (enumName) => {
          const createTypeRegex = new RegExp(`CREATE TYPE "public"\\."${enumName}"`, 'i');
          expect(migrationSQL).toMatch(createTypeRegex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.7, 6.8**
   *
   * Foreign key constraints are present in the migration:
   * - password_reset_tokens.user_id → users.id
   * - modules.segment_id → segments.id
   * - lessons.module_id → modules.id
   */
  it('migration contains foreign key constraints for all expected relationships', () => {
    const foreignKeys = [
      { table: 'password_reset_tokens', column: 'user_id', refTable: 'users', refColumn: 'id' },
      { table: 'modules', column: 'segment_id', refTable: 'segments', refColumn: 'id' },
      { table: 'lessons', column: 'module_id', refTable: 'modules', refColumn: 'id' },
    ] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...foreignKeys),
        (fk) => {
          // Check for ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY pattern
          const fkRegex = new RegExp(
            `ALTER TABLE "${fk.table}"[\\s\\S]*?FOREIGN KEY \\("${fk.column}"\\) REFERENCES "public"\\."${fk.refTable}"\\("${fk.refColumn}"\\)`,
            'i'
          );
          expect(migrationSQL).toMatch(fkRegex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.7, 6.8**
   *
   * For each table, key columns defined in the Drizzle schema exist in the migration SQL.
   */
  it('migration contains key columns for all tables', () => {
    const tableColumns: Record<string, string[]> = {
      users: ['id', 'email', 'password_hash', 'name', 'role', 'status', 'created_at', 'updated_at'],
      password_reset_tokens: ['id', 'user_id', 'token_hash', 'expires_at', 'used_at', 'created_at'],
      segments: ['id', 'title', 'description', 'status', 'created_at', 'updated_at'],
      modules: ['id', 'segment_id', 'title', 'description', 'sort_order', 'created_at', 'updated_at'],
      lessons: ['id', 'module_id', 'title', 'content_type', 'content_body', 'video_url', 'sort_order', 'created_at', 'updated_at'],
    };

    // Generate pairs of (table, column) to verify
    const tableColumnPairs = Object.entries(tableColumns).flatMap(
      ([table, columns]) => columns.map((col) => ({ table, column: col }))
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...tableColumnPairs),
        ({ table, column }) => {
          // Extract the CREATE TABLE block for this table
          const tableBlockRegex = new RegExp(
            `CREATE TABLE "${table}"\\s*\\([\\s\\S]*?\\);`,
            'i'
          );
          const tableBlock = migrationSQL.match(tableBlockRegex);
          expect(tableBlock).not.toBeNull();

          // Verify the column exists within the table block
          const columnRegex = new RegExp(`"${column}"`, 'i');
          expect(tableBlock![0]).toMatch(columnRegex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.7, 6.8**
   *
   * Enum values in the migration match the Drizzle schema definitions.
   */
  it('migration contains correct enum values for all defined enums', () => {
    const enumValues: Record<string, string[]> = {
      user_role: ['admin', 'learner'],
      user_status: ['active', 'inactive', 'deactivated'],
      segment_status: ['draft', 'active', 'archived'],
      lesson_content_type: ['text', 'video'],
    };

    const enumValuePairs = Object.entries(enumValues).flatMap(
      ([enumName, values]) => values.map((value) => ({ enumName, value }))
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...enumValuePairs),
        ({ enumName, value }) => {
          // Find the CREATE TYPE line for this enum
          const enumRegex = new RegExp(
            `CREATE TYPE "public"\\."${enumName}" AS ENUM\\([^)]+\\)`,
            'i'
          );
          const enumMatch = migrationSQL.match(enumRegex);
          expect(enumMatch).not.toBeNull();

          // Verify the value exists in the enum definition
          expect(enumMatch![0]).toContain(`'${value}'`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
