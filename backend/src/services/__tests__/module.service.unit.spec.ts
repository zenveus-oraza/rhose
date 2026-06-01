import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/AppError.js';

// Mock the db module before importing the service
vi.mock('../../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
      _mocks: {
        mockInsert,
        mockValues,
        mockReturning,
        mockSelect,
        mockFrom,
        mockWhere,
        mockLimit,
        mockOrderBy,
        mockUpdate,
        mockUpdateSet,
        mockUpdateWhere,
        mockUpdateReturning,
        mockDelete,
        mockDeleteWhere,
      },
    },
  };
});

// Import after mocking
import { moduleService } from '../module.service.js';
import { db } from '../../db/index.js';

// Helper to access mock internals
const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

describe('Module Service — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a module with next sort_order when segment has existing modules', async () => {
      const mockModule = {
        id: 'mod-1',
        segmentId: 'seg-1',
        title: 'New Module',
        description: null,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: verify segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Second call: get max sort_order
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ maxOrder: 2 }]),
          })),
        };
      });

      mocks.mockReturning.mockResolvedValue([mockModule]);

      const result = await moduleService.create('seg-1', { title: 'New Module' });

      expect(result).toEqual(mockModule);
      expect(result.sortOrder).toBe(3);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        segmentId: 'seg-1',
        title: 'New Module',
        description: null,
        sortOrder: 3,
      });
    });

    it('should assign sort_order 1 when segment has no modules', async () => {
      const mockModule = {
        id: 'mod-1',
        segmentId: 'seg-1',
        title: 'First Module',
        description: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Verify segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Max sort_order = 0 (no modules)
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
          })),
        };
      });

      mocks.mockReturning.mockResolvedValue([mockModule]);

      const result = await moduleService.create('seg-1', { title: 'First Module' });

      expect(result.sortOrder).toBe(1);
      expect(mocks.mockValues).toHaveBeenCalledWith({
        segmentId: 'seg-1',
        title: 'First Module',
        description: null,
        sortOrder: 1,
      });
    });

    it('should throw 404 when parent segment does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        moduleService.create('non-existent-seg', { title: 'Module' })
      ).rejects.toThrow(AppError);

      // Reset for second assertion
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        moduleService.create('non-existent-seg', { title: 'Module' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Parent segment does not exist',
      });
    });
  });

  describe('delete', () => {
    it('should delete a module with no lessons and reorder remaining modules', async () => {
      const existingModule = {
        id: 'mod-2',
        segmentId: 'seg-1',
        title: 'Module 2',
        description: null,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Find module
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([existingModule]),
              })),
            })),
          };
        }
        if (selectCallCount === 2) {
          // Count lessons = 0
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            })),
          };
        }
        // Remaining modules after deletion (for reorder)
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([
                { id: 'mod-1' },
                { id: 'mod-3' },
              ]),
            })),
          })),
        };
      });

      mocks.mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mocks.mockUpdate.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      });

      await expect(moduleService.delete('mod-2')).resolves.toBeUndefined();
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('should throw 400 HAS_CHILDREN when module has lessons', async () => {
      const existingModule = {
        id: 'mod-with-lessons',
        segmentId: 'seg-1',
        title: 'Has Lessons',
        description: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      function setupDeleteWithLessonsMock() {
        let selectCallCount = 0;
        mocks.mockSelect.mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Find module
            return {
              from: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue([existingModule]),
                })),
              })),
            };
          }
          // Lesson count = 4
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 4 }]),
            })),
          };
        });
      }

      setupDeleteWithLessonsMock();
      await expect(moduleService.delete('mod-with-lessons')).rejects.toThrow(AppError);

      setupDeleteWithLessonsMock();
      await expect(moduleService.delete('mod-with-lessons')).rejects.toMatchObject({
        statusCode: 400,
        code: 'HAS_CHILDREN',
      });
    });

    it('should include lesson count in HAS_CHILDREN error details', async () => {
      const existingModule = {
        id: 'mod-with-7-lessons',
        segmentId: 'seg-1',
        title: 'Has 7 Lessons',
        description: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([existingModule]),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 7 }]),
          })),
        };
      });

      try {
        await moduleService.delete('mod-with-7-lessons');
        expect.fail('Should have thrown');
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.details).toEqual({ lessonCount: 7 });
      }
    });

    it('should throw 404 when deleting a non-existent module', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(moduleService.delete('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('reorder', () => {
    it('should assign contiguous sort_order values starting from 1', async () => {
      const orderedIds = ['mod-c', 'mod-a', 'mod-b'];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Verify segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Get existing modules in segment
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              { id: 'mod-a' },
              { id: 'mod-b' },
              { id: 'mod-c' },
            ]),
          })),
        };
      });

      const updateSetMock = vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));
      mocks.mockUpdate.mockReturnValue({ set: updateSetMock });

      await moduleService.reorder('seg-1', orderedIds);

      // Should have called update 3 times (once per module)
      expect(mocks.mockUpdate).toHaveBeenCalledTimes(3);
      // Verify sort_order assignments: mod-c=1, mod-a=2, mod-b=3
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 1 })
      );
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 2 })
      );
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 3 })
      );
    });

    it('should throw 404 when segment does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        moduleService.reorder('non-existent-seg', ['mod-1'])
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should throw 400 when orderedIds contains module not in segment', async () => {
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Verify segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Existing modules in segment
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              { id: 'mod-a' },
              { id: 'mod-b' },
            ]),
          })),
        };
      });

      await expect(
        moduleService.reorder('seg-1', ['mod-a', 'mod-b', 'mod-unknown'])
      ).rejects.toThrow(AppError);
    });

    it('should throw 400 when orderedIds does not include all modules', async () => {
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Verify segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Existing modules in segment (3 modules)
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              { id: 'mod-a' },
              { id: 'mod-b' },
              { id: 'mod-c' },
            ]),
          })),
        };
      });

      await expect(
        moduleService.reorder('seg-1', ['mod-a', 'mod-b'])
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('listBySegment', () => {
    it('should throw 404 when segment does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(moduleService.listBySegment('non-existent-seg')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Parent segment does not exist',
      });
    });
  });

  describe('update', () => {
    it('should throw 404 when module does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        moduleService.update('non-existent', { title: 'New Title' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should update module title and return updated module', async () => {
      const existingModule = {
        id: 'mod-1',
        segmentId: 'seg-1',
        title: 'Old Title',
        description: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedModule = {
        ...existingModule,
        title: 'New Title',
        updatedAt: new Date(),
      };

      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existingModule]),
          })),
        })),
      }));

      mocks.mockUpdateSet.mockReturnValue({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([updatedModule]),
        })),
      });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockUpdateSet });

      const result = await moduleService.update('mod-1', { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });
  });
});
