import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/AppError.js';

// Mock the db module before importing the service
vi.mock('../../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: vi.fn() }));
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
    it('should create a segment with title and default draft status', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Segment',
        description: null,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      const result = await segmentService.create({ title: 'Test Segment' });

      expect(result).toEqual(mockSegment);
      expect(result.status).toBe('draft');
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'Test Segment',
        description: null,
      });
    });

    it('should create a segment with title and description', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Test Segment',
        description: 'A detailed description',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      const result = await segmentService.create({
        title: 'Test Segment',
        description: 'A detailed description',
      });

      expect(result).toEqual(mockSegment);
      expect(result.description).toBe('A detailed description');
      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'Test Segment',
        description: 'A detailed description',
      });
    });

    it('should set description to null when not provided', async () => {
      const mockSegment = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        title: 'No Desc',
        description: null,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([mockSegment]);

      await segmentService.create({ title: 'No Desc' });

      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'No Desc',
        description: null,
      });
    });
  });

  describe('getById', () => {
    it('should return segment with module count when found', async () => {
      const mockSegment = {
        id: 'seg-1',
        title: 'Found Segment',
        description: 'desc',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call: select segment
      // Second call: select module count
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        const mockFrom = vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockSegment]),
          })),
        }));
        if (selectCallCount === 1) {
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

  describe('update — status transitions', () => {
    const makeExistingSegment = (status: string) => ({
      id: 'seg-update',
      title: 'Existing',
      description: null,
      status,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    function setupUpdateMocks(existingSegment: ReturnType<typeof makeExistingSegment>, updatedSegment: unknown) {
      // First select: find existing segment
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(selectCallCount === 1 ? [existingSegment] : []),
            })),
          })),
        };
      });

      // Update chain
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
  });

  describe('delete', () => {
    it('should delete a segment with no modules', async () => {
      const existing = {
        id: 'seg-del',
        title: 'To Delete',
        description: null,
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
  });

  describe('list', () => {
    it('should return all segments ordered by created_at descending', async () => {
      const mockSegments = [
        { id: 'seg-2', title: 'Newer', status: 'active', createdAt: new Date('2024-02-01'), updatedAt: new Date() },
        { id: 'seg-1', title: 'Older', status: 'draft', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      ];

      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue(mockSegments),
        })),
      }));

      const result = await segmentService.list();

      expect(result).toEqual(mockSegments);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no segments exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([]),
        })),
      }));

      const result = await segmentService.list();

      expect(result).toEqual([]);
    });
  });
});
