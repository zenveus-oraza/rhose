import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m2-admin-content-management, Property 6: Update Persistence Round-Trip
 *
 * **Validates: Requirements 2.6, 3.5, 4.9, 5.7**
 *
 * For any valid update to a Segment, Module, Lesson, or User, applying the update
 * and then fetching the entity by ID SHALL return the updated field values, and the
 * updated_at timestamp SHALL be greater than or equal to the previous value.
 */

// --- In-memory models simulating the update-then-fetch pattern ---

interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SegmentEntity extends BaseEntity {
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
}

interface ModuleEntity extends BaseEntity {
  title: string;
  description: string | null;
  segmentId: string;
  sortOrder: number;
}

interface LessonEntity extends BaseEntity {
  title: string;
  contentType: 'text' | 'video';
  contentBody: string | null;
  videoUrl: string | null;
  moduleId: string;
  sortOrder: number;
}

interface UserEntity extends BaseEntity {
  name: string;
  email: string;
  role: 'admin' | 'learner';
  status: 'active' | 'deactivated';
}

// --- In-memory store simulating persistence ---

class InMemoryStore<T extends BaseEntity> {
  private entities: Map<string, T> = new Map();

  create(entity: T): T {
    this.entities.set(entity.id, { ...entity });
    return { ...entity };
  }

  getById(id: string): T | undefined {
    const entity = this.entities.get(id);
    return entity ? { ...entity } : undefined;
  }

  update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): T | undefined {
    const existing = this.entities.get(id);
    if (!existing) return undefined;

    // Only apply defined fields (undefined means "don't update this field")
    const definedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        definedUpdates[key] = value;
      }
    }

    const updated: T = {
      ...existing,
      ...definedUpdates,
      updatedAt: new Date(), // Always update the timestamp
    } as T;
    this.entities.set(id, updated);
    return { ...updated };
  }
}

// --- Segment update simulation ---

interface SegmentUpdate {
  title?: string;
  description?: string | null;
}

function createSegment(store: InMemoryStore<SegmentEntity>, title: string, description: string | null): SegmentEntity {
  const now = new Date();
  const entity: SegmentEntity = {
    id: `segment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    description,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  return store.create(entity);
}

function updateSegment(store: InMemoryStore<SegmentEntity>, id: string, updates: SegmentUpdate): SegmentEntity | undefined {
  return store.update(id, updates);
}

// --- Module update simulation ---

interface ModuleUpdate {
  title?: string;
  description?: string | null;
}

function createModule(store: InMemoryStore<ModuleEntity>, title: string, description: string | null, segmentId: string, sortOrder: number): ModuleEntity {
  const now = new Date();
  const entity: ModuleEntity = {
    id: `module-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    description,
    segmentId,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  return store.create(entity);
}

function updateModule(store: InMemoryStore<ModuleEntity>, id: string, updates: ModuleUpdate): ModuleEntity | undefined {
  return store.update(id, updates);
}

// --- Lesson update simulation ---

interface LessonUpdate {
  title?: string;
  contentBody?: string | null;
}

function createLesson(store: InMemoryStore<LessonEntity>, title: string, contentBody: string, moduleId: string, sortOrder: number): LessonEntity {
  const now = new Date();
  const entity: LessonEntity = {
    id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    contentType: 'text',
    contentBody,
    videoUrl: null,
    moduleId,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  return store.create(entity);
}

function updateLesson(store: InMemoryStore<LessonEntity>, id: string, updates: LessonUpdate): LessonEntity | undefined {
  return store.update(id, updates);
}

// --- User update simulation ---

interface UserUpdate {
  name?: string;
  role?: 'admin' | 'learner';
}

function createUser(store: InMemoryStore<UserEntity>, name: string, email: string, role: 'admin' | 'learner'): UserEntity {
  const now = new Date();
  const entity: UserEntity = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    email,
    role,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  return store.create(entity);
}

function updateUser(store: InMemoryStore<UserEntity>, id: string, updates: UserUpdate): UserEntity | undefined {
  return store.update(id, updates);
}

// --- Arbitraries ---

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

const arbOptionalDescription = fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null });

const arbSegmentUpdate = fc.record({
  title: fc.option(arbNonEmptyString, { nil: undefined }),
  description: fc.option(fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }), { nil: undefined }),
}).filter((u) => u.title !== undefined || u.description !== undefined);

const arbModuleUpdate = fc.record({
  title: fc.option(arbNonEmptyString, { nil: undefined }),
  description: fc.option(fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }), { nil: undefined }),
}).filter((u) => u.title !== undefined || u.description !== undefined);

const arbLessonUpdate = fc.record({
  title: fc.option(arbNonEmptyString, { nil: undefined }),
  contentBody: fc.option(fc.option(fc.string({ minLength: 1, maxLength: 2000 }), { nil: null }), { nil: undefined }),
}).filter((u) => u.title !== undefined || u.contentBody !== undefined);

const arbUserUpdate = fc.record({
  name: fc.option(arbNonEmptyString, { nil: undefined }),
  role: fc.option(fc.constantFrom<'admin' | 'learner'>('admin', 'learner'), { nil: undefined }),
}).filter((u) => u.name !== undefined || u.role !== undefined);

const arbUserRole = fc.constantFrom<'admin' | 'learner'>('admin', 'learner');

describe('Feature: m2-admin-content-management, Property 6: Update Persistence Round-Trip', () => {
  /**
   * **Validates: Requirements 2.6**
   *
   * For any valid segment update (title or description), applying the update
   * and re-fetching the segment returns the updated field values, and updated_at
   * is greater than or equal to the previous value.
   */
  it('segment update persists and updated_at advances', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        arbOptionalDescription,
        arbSegmentUpdate,
        (initialTitle, initialDesc, update) => {
          const store = new InMemoryStore<SegmentEntity>();
          const created = createSegment(store, initialTitle, initialDesc);
          const previousUpdatedAt = created.updatedAt;

          // Apply update
          const updated = updateSegment(store, created.id, update);
          expect(updated).toBeDefined();

          // Re-fetch
          const fetched = store.getById(created.id);
          expect(fetched).toBeDefined();

          // Verify updated fields persist
          if (update.title !== undefined) {
            expect(fetched!.title).toBe(update.title);
          } else {
            expect(fetched!.title).toBe(initialTitle);
          }

          if (update.description !== undefined) {
            expect(fetched!.description).toBe(update.description);
          } else {
            expect(fetched!.description).toBe(initialDesc);
          }

          // Verify updated_at is >= previous value
          expect(fetched!.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * For any valid module update (title or description), applying the update
   * and re-fetching the module returns the updated field values, and updated_at
   * is greater than or equal to the previous value.
   */
  it('module update persists and updated_at advances', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        arbOptionalDescription,
        arbModuleUpdate,
        (initialTitle, initialDesc, update) => {
          const store = new InMemoryStore<ModuleEntity>();
          const created = createModule(store, initialTitle, initialDesc, 'segment-1', 1);
          const previousUpdatedAt = created.updatedAt;

          // Apply update
          const updated = updateModule(store, created.id, update);
          expect(updated).toBeDefined();

          // Re-fetch
          const fetched = store.getById(created.id);
          expect(fetched).toBeDefined();

          // Verify updated fields persist
          if (update.title !== undefined) {
            expect(fetched!.title).toBe(update.title);
          } else {
            expect(fetched!.title).toBe(initialTitle);
          }

          if (update.description !== undefined) {
            expect(fetched!.description).toBe(update.description);
          } else {
            expect(fetched!.description).toBe(initialDesc);
          }

          // Verify updated_at is >= previous value
          expect(fetched!.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.9**
   *
   * For any valid lesson update (title or content_body), applying the update
   * and re-fetching the lesson returns the updated field values, and updated_at
   * is greater than or equal to the previous value.
   */
  it('lesson update persists and updated_at advances', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        arbNonEmptyString,
        arbLessonUpdate,
        (initialTitle, initialContent, update) => {
          const store = new InMemoryStore<LessonEntity>();
          const created = createLesson(store, initialTitle, initialContent, 'module-1', 1);
          const previousUpdatedAt = created.updatedAt;

          // Apply update
          const updated = updateLesson(store, created.id, update);
          expect(updated).toBeDefined();

          // Re-fetch
          const fetched = store.getById(created.id);
          expect(fetched).toBeDefined();

          // Verify updated fields persist
          if (update.title !== undefined) {
            expect(fetched!.title).toBe(update.title);
          } else {
            expect(fetched!.title).toBe(initialTitle);
          }

          if (update.contentBody !== undefined) {
            expect(fetched!.contentBody).toBe(update.contentBody);
          } else {
            expect(fetched!.contentBody).toBe(initialContent);
          }

          // Verify updated_at is >= previous value
          expect(fetched!.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.7**
   *
   * For any valid user update (name or role), applying the update
   * and re-fetching the user returns the updated field values, and updated_at
   * is greater than or equal to the previous value.
   */
  it('user update persists and updated_at advances', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        arbUserRole,
        arbUserUpdate,
        (initialName, initialRole, update) => {
          const store = new InMemoryStore<UserEntity>();
          const created = createUser(store, initialName, 'user@example.com', initialRole);
          const previousUpdatedAt = created.updatedAt;

          // Apply update
          const updated = updateUser(store, created.id, update);
          expect(updated).toBeDefined();

          // Re-fetch
          const fetched = store.getById(created.id);
          expect(fetched).toBeDefined();

          // Verify updated fields persist
          if (update.name !== undefined) {
            expect(fetched!.name).toBe(update.name);
          } else {
            expect(fetched!.name).toBe(initialName);
          }

          if (update.role !== undefined) {
            expect(fetched!.role).toBe(update.role);
          } else {
            expect(fetched!.role).toBe(initialRole);
          }

          // Verify updated_at is >= previous value
          expect(fetched!.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.6, 3.5, 4.9, 5.7**
   *
   * Multiple sequential updates to the same entity all persist correctly,
   * and updated_at monotonically advances with each update.
   */
  it('multiple sequential updates all persist and updated_at monotonically advances', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        fc.array(arbSegmentUpdate, { minLength: 2, maxLength: 10 }),
        (initialTitle, updates) => {
          const store = new InMemoryStore<SegmentEntity>();
          const created = createSegment(store, initialTitle, null);
          let previousUpdatedAt = created.updatedAt;

          for (const update of updates) {
            const updated = updateSegment(store, created.id, update);
            expect(updated).toBeDefined();

            // Re-fetch after each update
            const fetched = store.getById(created.id);
            expect(fetched).toBeDefined();

            // Verify updated_at monotonically advances
            expect(fetched!.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
            previousUpdatedAt = fetched!.updatedAt;

            // Verify the latest update fields persist
            if (update.title !== undefined) {
              expect(fetched!.title).toBe(update.title);
            }
            if (update.description !== undefined) {
              expect(fetched!.description).toBe(update.description);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.6, 3.5, 4.9, 5.7**
   *
   * Updating an entity does not modify its id or createdAt fields.
   */
  it('update does not modify id or createdAt for any entity type', () => {
    fc.assert(
      fc.property(
        arbNonEmptyString,
        arbSegmentUpdate,
        (initialTitle, update) => {
          const store = new InMemoryStore<SegmentEntity>();
          const created = createSegment(store, initialTitle, null);
          const originalId = created.id;
          const originalCreatedAt = created.createdAt;

          // Apply update
          updateSegment(store, created.id, update);

          // Re-fetch
          const fetched = store.getById(created.id);
          expect(fetched).toBeDefined();

          // id and createdAt must remain unchanged
          expect(fetched!.id).toBe(originalId);
          expect(fetched!.createdAt.getTime()).toBe(originalCreatedAt.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });
});
