import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/AppError.js';

// Mock the db module before importing the service
vi.mock('../../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOffset = vi.fn();
  const mockLimit = vi.fn(() => ({ offset: mockOffset }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
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
      // Expose internals for test access
      _mocks: {
        mockInsert,
        mockValues,
        mockReturning,
        mockSelect,
        mockFrom,
        mockWhere,
        mockLimit,
        mockOffset,
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
import { segmentService } from '../segment.service.js';
import { db } from '../../db/index.js';

// Helper to access mock internals
const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

describe('Segment Service — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a segment with title, duration, and default draft status', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Segment',
        description: null,
        duration: 30,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      const result = await segmentService.create({ title: 'Test Segment', duration: 30 });

      expect(result).toEqual(mockSegment);
      expect(result.status).toBe('draft');
      expect(result.duration).toBe(30);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'Test Segment',
        description: null,
        duration: 30,
      });
    });

    it('should create a segment with title, description, and duration', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Test Segment',
        description: 'A detailed description',
        duration: 14,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      const result = await segmentService.create({
        title: 'Test Segment',
        description: 'A detailed description',
        duration: 14,
      });

      expect(result).toEqual(mockSegment);
      expect(result.description).toBe('A detailed description');
      expect(result.duration).toBe(14);
      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'Test Segment',
        description: 'A detailed description',
        duration: 14,
      });
    });

    it('should set description to null when not provided', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        title: 'No Desc',
        description: null,
        duration: 7,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      await segmentService.create({ title: 'No Desc', duration: 7 });

      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'No Desc',
        description: null,
        duration: 7,
      });
    });

    it('should persist large duration values correctly', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        title: 'Long Segment',
        description: null,
        duration: 365,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      const result = await segmentService.create({ title: 'Long Segment', duration: 365 });

      expect(result.duration).toBe(365);
      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'Long Segment',
        description: null,
        duration: 365,
      });
    });
  });

  describe('getById', () => {
    it('should return segment with module count and duration when found', async () => {
      const mockSegment = {
        id: 'seg-1',
        title: 'Found Segment',
        description: 'desc',
        duration: 21,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call: select segment by id
      // Second call: count modules
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          const mockFrom = vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([mockSegment]),
            })),
          }));
          return { from: mockFrom };
        }
        // Second call for module count
        const mockFromCount = vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }));
        return { from: mockFromCount };
      });

      const result = await segmentService.getById('seg-1');

      expect(result).toEqual({ ...mockSegment, moduleCount: 3 });
      expect(result.duration).toBe(21);
      expect(result.moduleCount).toBe(3);
    });

    it('should return duration field in getById response', async () => {
      const mockSegment = {
        id: 'seg-dur',
        title: 'Duration Segment',
        description: null,
        duration: 45,
        status: 'draft',
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
                limit: vi.fn().mockResolvedValue([mockSegment]),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          })),
        };
      });

      const result = await segmentService.getById('seg-dur');

      expect(result.duration).toBe(45);
      expect(result).toHaveProperty('duration');
    });

    it('should throw 404 AppError when segment does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(segmentService.getById('non-existent-id')).rejects.toThrow(AppError);
      await expect(segmentService.getById('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('update — duration', () => {
    function setupUpdateMocks(
      existingSegment: Record<string, unknown>,
      updatedSegment: Record<string, unknown>
    ) {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existingSegment]),
          })),
        })),
      }));

      mocks.mockUpdateSet.mockReturnValue({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([updatedSegment]),
        })),
      });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockUpdateSet });
    }

    it('should update duration and persist correctly', async () => {
      const existing = {
        id: 'seg-dur-update',
        title: 'Existing',
        description: null,
        duration: 30,
        status: 'draft',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updated = { ...existing, duration: 60, updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-dur-update', { duration: 60 });

      expect(result.duration).toBe(60);
    });

    it('should update duration along with other fields', async () => {
      const existing = {
        id: 'seg-dur-multi',
        title: 'Old Title',
        description: null,
        duration: 10,
        status: 'draft',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updated = { ...existing, title: 'New Title', duration: 90, updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-dur-multi', { title: 'New Title', duration: 90 });

      expect(result.title).toBe('New Title');
      expect(result.duration).toBe(90);
    });
  });

  describe('update — status transitions', () => {
    const makeExistingSegment = (status: string) => ({
      id: 'seg-update',
      title: 'Existing',
      description: null,
      duration: 30,
      status,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    function setupUpdateMocks(existingSegment: ReturnType<typeof makeExistingSegment>, updatedSegment: unknown) {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existingSegment]),
          })),
        })),
      }));

      mocks.mockUpdateSet.mockReturnValue({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([updatedSegment]),
        })),
      });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockUpdateSet });
    }

    it('should allow transition from draft to active', async () => {
      const existing = makeExistingSegment('draft');
      const updated = { ...existing, status: 'active', updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-update', { status: 'active' });

      expect(result.status).toBe('active');
    });

    it('should allow transition from draft to archived', async () => {
      const existing = makeExistingSegment('draft');
      const updated = { ...existing, status: 'archived', updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-update', { status: 'archived' });

      expect(result.status).toBe('archived');
    });

    it('should allow transition from active to archived', async () => {
      const existing = makeExistingSegment('active');
      const updated = { ...existing, status: 'archived', updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-update', { status: 'archived' });

      expect(result.status).toBe('archived');
    });

    it('should reject transition from archived to active', async () => {
      const existing = makeExistingSegment('archived');
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existing]),
          })),
        })),
      }));

      await expect(
        segmentService.update('seg-update', { status: 'active' })
      ).rejects.toThrow(AppError);

      await expect(
        segmentService.update('seg-update', { status: 'active' })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Archived segments cannot change status',
      });
    });

    it('should reject transition from archived to draft', async () => {
      const existing = makeExistingSegment('archived');
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existing]),
          })),
        })),
      }));

      await expect(
        segmentService.update('seg-update', { status: 'draft' })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS_TRANSITION',
      });
    });

    it('should reject transition from active to draft', async () => {
      const existing = makeExistingSegment('active');
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existing]),
          })),
        })),
      }));

      await expect(
        segmentService.update('seg-update', { status: 'draft' })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS_TRANSITION',
      });
    });

    it('should throw 404 when updating a non-existent segment', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        segmentService.update('non-existent', { title: 'New Title' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should allow updating title without changing status', async () => {
      const existing = makeExistingSegment('draft');
      const updated = { ...existing, title: 'Updated Title', updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-update', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should allow updating description', async () => {
      const existing = makeExistingSegment('active');
      const updated = { ...existing, description: 'New description', updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-update', { description: 'New description' });

      expect(result.description).toBe('New description');
    });

    it('should not trigger transition validation when status is same as current', async () => {
      const existing = makeExistingSegment('draft');
      const updated = { ...existing, title: 'Changed', updatedAt: new Date() };
      setupUpdateMocks(existing, updated);

      // Passing same status should not throw
      const result = await segmentService.update('seg-update', { status: 'draft', title: 'Changed' });

      expect(result.title).toBe('Changed');
    });

    it('should update timestamp on valid status transition', async () => {
      const existing = makeExistingSegment('draft');
      const newUpdatedAt = new Date('2024-06-15');
      const updated = { ...existing, status: 'active', updatedAt: newUpdatedAt };
      setupUpdateMocks(existing, updated);

      const result = await segmentService.update('seg-update', { status: 'active' });

      expect(result.updatedAt).toEqual(newUpdatedAt);
      expect(result.updatedAt).not.toEqual(existing.updatedAt);
    });
  });

  describe('delete', () => {
    it('should delete a segment with no modules', async () => {
      const existing = {
        id: 'seg-del',
        title: 'To Delete',
        description: null,
        duration: 30,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: find segment
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([existing]),
              })),
            })),
          };
        }
        // Second call: count modules
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          })),
        };
      });

      mocks.mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await expect(segmentService.delete('seg-del')).resolves.toBeUndefined();
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('should throw 400 HAS_CHILDREN when segment has modules', async () => {
      const existing = {
        id: 'seg-with-modules',
        title: 'Has Modules',
        description: null,
        duration: 14,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      function setupDeleteWithModulesMock() {
        let selectCallCount = 0;
        mocks.mockSelect.mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue([existing]),
                })),
              })),
            };
          }
          // Module count = 3
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 3 }]),
            })),
          };
        });
      }

      setupDeleteWithModulesMock();
      await expect(segmentService.delete('seg-with-modules')).rejects.toThrow(AppError);

      setupDeleteWithModulesMock();
      await expect(segmentService.delete('seg-with-modules')).rejects.toMatchObject({
        statusCode: 400,
        code: 'HAS_CHILDREN',
      });
    });

    it('should include module count in HAS_CHILDREN error details', async () => {
      const existing = {
        id: 'seg-with-5-modules',
        title: 'Has 5 Modules',
        description: null,
        duration: 7,
        status: 'draft',
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
                limit: vi.fn().mockResolvedValue([existing]),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          })),
        };
      });

      try {
        await segmentService.delete('seg-with-5-modules');
        expect.fail('Should have thrown');
      } catch (err) {
        const appErr = err as AppError;
        expect(appErr.details).toEqual({ moduleCount: 5 });
      }
    });

    it('should throw 404 when deleting a non-existent segment', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(segmentService.delete('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should block deletion regardless of segment status when modules exist', async () => {
      const existingDraft = {
        id: 'seg-draft-with-modules',
        title: 'Draft With Modules',
        description: null,
        duration: 10,
        status: 'draft',
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
                limit: vi.fn().mockResolvedValue([existingDraft]),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          })),
        };
      });

      await expect(segmentService.delete('seg-draft-with-modules')).rejects.toMatchObject({
        statusCode: 400,
        code: 'HAS_CHILDREN',
      });
    });
  });

  describe('list', () => {
    it('should return paginated segments with duration field included', async () => {
      const mockSegments = [
        { id: 'seg-2', title: 'Newer', description: null, duration: 30, status: 'active', createdAt: new Date('2024-02-01'), updatedAt: new Date() },
        { id: 'seg-1', title: 'Older', description: null, duration: 14, status: 'draft', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: count query
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 2 }]),
            })),
          };
        }
        // Second call: data query
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue(mockSegments),
                })),
              })),
            })),
          })),
        };
      });

      const result = await segmentService.list();

      expect(result.data).toEqual(mockSegments);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].duration).toBe(30);
      expect(result.data[1].duration).toBe(14);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should return empty array when no segments exist', async () => {
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Count query
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            })),
          };
        }
        // Data query
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        };
      });

      const result = await segmentService.list();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should include duration in listed segment objects', async () => {
      const mockSegments = [
        { id: 'seg-a', title: 'Alpha', description: 'desc', duration: 7, status: 'draft', createdAt: new Date(), updatedAt: new Date() },
        { id: 'seg-b', title: 'Beta', description: null, duration: 90, status: 'active', createdAt: new Date(), updatedAt: new Date() },
        { id: 'seg-c', title: 'Gamma', description: null, duration: 365, status: 'archived', createdAt: new Date(), updatedAt: new Date() },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 3 }]),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue(mockSegments),
                })),
              })),
            })),
          })),
        };
      });

      const result = await segmentService.list();

      // Verify all segments have duration field
      for (const segment of result.data) {
        expect(segment).toHaveProperty('duration');
        expect(typeof segment.duration).toBe('number');
      }
      expect(result.data[0].duration).toBe(7);
      expect(result.data[1].duration).toBe(90);
      expect(result.data[2].duration).toBe(365);
    });

    it('should respect pagination parameters', async () => {
      const mockSegments = [
        { id: 'seg-3', title: 'Page 2 Item', description: null, duration: 20, status: 'draft', createdAt: new Date(), updatedAt: new Date() },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 25 }]),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue(mockSegments),
                })),
              })),
            })),
          })),
        };
      });

      const result = await segmentService.list({ page: 2, limit: 10 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });
});
