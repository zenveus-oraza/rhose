import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/AppError.js';

// Mock the db module before importing the service
vi.mock('../../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
      _mocks: {
        mockInsert,
        mockValues,
        mockReturning,
        mockSelect,
        mockFrom,
        mockWhere,
        mockLimit,
        mockInnerJoin,
        mockDelete,
        mockDeleteWhere,
      },
    },
  };
});

// Import after mocking
import { assignmentService } from '../assignment.service.js';
import { db } from '../../db/index.js';

const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

describe('Assignment Service — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assign', () => {
    it('should create an assignment and return confirmation', async () => {
      const mockAssignment = {
        id: 'assign-1',
        userId: 'user-1',
        segmentId: 'seg-1',
        accessDurationDays: null,
        assignedAt: new Date(),
      };

      // Setup: 3 select calls (user check, segment check, duplicate check)
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // User exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
              })),
            })),
          };
        }
        if (selectCallCount === 2) {
          // Segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // No duplicate
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
      });

      mocks.mockReturning.mockResolvedValue([mockAssignment]);

      const result = await assignmentService.assign({
        userId: 'user-1',
        segmentId: 'seg-1',
      });

      expect(result).toEqual(mockAssignment);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('should return 409 for duplicate assignment', async () => {
      const existingAssignment = {
        id: 'assign-existing',
        assignedAt: new Date('2024-01-15'),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // User exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
              })),
            })),
          };
        }
        if (selectCallCount === 2) {
          // Segment exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Duplicate found
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([existingAssignment]),
            })),
          })),
        };
      });

      await expect(
        assignmentService.assign({ userId: 'user-1', segmentId: 'seg-1' })
      ).rejects.toThrow(AppError);

      // Reset for second assertion
      selectCallCount = 0;
      await expect(
        assignmentService.assign({ userId: 'user-1', segmentId: 'seg-1' })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
      });
    });

    it('should return 404 when user does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        assignmentService.assign({ userId: 'non-existent', segmentId: 'seg-1' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    });

    it('should return 404 when segment does not exist', async () => {
      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // User exists
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
              })),
            })),
          };
        }
        // Segment not found
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
      });

      await expect(
        assignmentService.assign({ userId: 'user-1', segmentId: 'non-existent' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Segment not found',
      });
    });
  });

  describe('remove', () => {
    it('should delete an assignment when it exists', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'assign-1' }]),
          })),
        })),
      }));

      mocks.mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await expect(assignmentService.remove('assign-1')).resolves.toBeUndefined();
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('should return 404 when assignment does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        assignmentService.remove('non-existent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Assignment not found',
      });
    });
  });

  describe('listBySegment', () => {
    it('should return assigned users for a segment', async () => {
      const mockUsers = [
        {
          id: 'assign-1',
          userId: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: 'learner',
          status: 'active',
          assignedAt: new Date(),
          accessDurationDays: null,
        },
        {
          id: 'assign-2',
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          role: 'learner',
          status: 'active',
          assignedAt: new Date(),
          accessDurationDays: 30,
        },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Segment exists check
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
              })),
            })),
          };
        }
        // Return assigned users
        return {
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn().mockResolvedValue(mockUsers),
            })),
          })),
        };
      });

      const result = await assignmentService.listBySegment('seg-1');

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return 404 when segment does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        assignmentService.listBySegment('non-existent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Segment not found',
      });
    });
  });

  describe('listByUser', () => {
    it('should return assigned segments for a user', async () => {
      const mockSegments = [
        {
          id: 'assign-1',
          segmentId: 'seg-1',
          title: 'Segment One',
          status: 'active',
          assignedAt: new Date(),
          accessDurationDays: null,
        },
        {
          id: 'assign-2',
          segmentId: 'seg-2',
          title: 'Segment Two',
          status: 'draft',
          assignedAt: new Date(),
          accessDurationDays: 60,
        },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // User exists check
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
              })),
            })),
          };
        }
        // Return assigned segments
        return {
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn().mockResolvedValue(mockSegments),
            })),
          })),
        };
      });

      const result = await assignmentService.listByUser('user-1');

      expect(result).toEqual(mockSegments);
      expect(result).toHaveLength(2);
    });

    it('should return 404 when user does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        assignmentService.listByUser('non-existent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    });
  });
});
