import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

/**
 * Integration Tests: Content Hierarchy, Auth Flow, Assignment Flow, and Dashboard Stats
 *
 * These tests verify end-to-end service layer behavior by mocking the database layer,
 * testing the full flow of content management operations.
 *
 * Validates: Requirements 7.1–7.7, 1.3, 1.4
 */

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOffset = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderBy, offset: mockOffset }));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, innerJoin: mockInnerJoin }));
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
        mockOffset,
        mockOrderBy,
        mockInnerJoin,
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

vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-integration-tests',
    JWT_EXPIRES_IN: '7d',
    DATABASE_URL: 'postgres://test',
    PORT: 3000,
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../utils/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  comparePassword: vi.fn().mockResolvedValue(true),
}));

import { db } from '../db/index.js';
import { segmentService } from '../services/segment.service.js';
import { moduleService } from '../services/module.service.js';
import { lessonService } from '../services/lesson.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;
const TEST_SECRET = 'test-secret-key-for-integration-tests';


// ============================================================================
// Test Suite 1: Content Hierarchy Flow
// ============================================================================

describe('Integration: Content Hierarchy Flow (Segment → Module → Lesson)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a segment with duration and verify duration in response', async () => {
    const mockSegment = {
      id: 'seg-1',
      title: 'Integration Segment',
      description: 'Full hierarchy test',
      duration: 30,
      status: 'draft',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    mocks.mockReturning.mockResolvedValueOnce([mockSegment]);

    const segment = await segmentService.create({
      title: 'Integration Segment',
      description: 'Full hierarchy test',
      duration: 30,
    });

    expect(segment.id).toBe('seg-1');
    expect(segment.status).toBe('draft');
    expect(segment.duration).toBe(30);
    expect(segment.title).toBe('Integration Segment');
  });

  it('should create modules under segment and verify sort_order auto-assignment', async () => {
    // Create first module — should get sort_order 1
    const mockModule1 = {
      id: 'mod-1',
      segmentId: 'seg-1',
      title: 'Module One',
      description: null,
      sortOrder: 1,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
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
      // Get max sort_order (no modules yet)
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
        })),
      };
    });
    mocks.mockReturning.mockResolvedValueOnce([mockModule1]);

    const module1 = await moduleService.create('seg-1', { title: 'Module One' });
    expect(module1.sortOrder).toBe(1);
    expect(module1.title).toBe('Module One');

    // Create second module — should get sort_order 2
    const mockModule2 = {
      id: 'mod-2',
      segmentId: 'seg-1',
      title: 'Module Two',
      description: null,
      sortOrder: 2,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    };

    selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
            })),
          })),
        };
      }
      // Max sort_order is now 1
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ maxOrder: 1 }]),
        })),
      };
    });
    mocks.mockReturning.mockResolvedValueOnce([mockModule2]);

    const module2 = await moduleService.create('seg-1', { title: 'Module Two' });
    expect(module2.sortOrder).toBe(2);
  });

  it('should create lessons with estimated_time fields and verify in listing', async () => {
    // Create a lesson with estimated time
    const mockLesson1 = {
      id: 'lesson-1',
      moduleId: 'mod-1',
      title: 'Lesson One',
      contentType: 'text',
      contentBody: 'Hello world',
      videoUrl: null,
      estimatedTimeValue: 15,
      estimatedTimeUnit: 'minutes',
      sortOrder: 1,
      createdAt: new Date('2024-01-04'),
      updatedAt: new Date('2024-01-04'),
    };

    let selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'mod-1' }]),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
        })),
      };
    });
    mocks.mockReturning.mockResolvedValueOnce([mockLesson1]);

    const lesson1 = await lessonService.create('mod-1', {
      title: 'Lesson One',
      content_type: 'text',
      content_body: 'Hello world',
      estimated_time_value: 15,
      estimated_time_unit: 'minutes',
    });
    expect(lesson1.sortOrder).toBe(1);
    expect(lesson1.estimatedTimeValue).toBe(15);
    expect(lesson1.estimatedTimeUnit).toBe('minutes');

    // Create a second lesson with different estimated time
    const mockLesson2 = {
      id: 'lesson-2',
      moduleId: 'mod-1',
      title: 'Lesson Two',
      contentType: 'video',
      contentBody: null,
      videoUrl: 'https://example.com/video.mp4',
      estimatedTimeValue: 2,
      estimatedTimeUnit: 'hours',
      sortOrder: 2,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
    };

    selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'mod-1' }]),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ maxOrder: 1 }]),
        })),
      };
    });
    mocks.mockReturning.mockResolvedValueOnce([mockLesson2]);

    const lesson2 = await lessonService.create('mod-1', {
      title: 'Lesson Two',
      content_type: 'video',
      video_url: 'https://example.com/video.mp4',
      estimated_time_value: 2,
      estimated_time_unit: 'hours',
    });
    expect(lesson2.sortOrder).toBe(2);
    expect(lesson2.estimatedTimeValue).toBe(2);
    expect(lesson2.estimatedTimeUnit).toBe('hours');

    // Verify listing returns lessons with estimated time in correct order
    selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Verify module exists
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'mod-1' }]),
            })),
          })),
        };
      }
      if (selectCallCount === 2) {
        // Count query
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          })),
        };
      }
      // Main listing query
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn().mockResolvedValue([
                  { id: 'lesson-1', title: 'Lesson One', sortOrder: 1, contentType: 'text', estimatedTimeValue: 15, estimatedTimeUnit: 'minutes', moduleId: 'mod-1', createdAt: new Date(), updatedAt: new Date() },
                  { id: 'lesson-2', title: 'Lesson Two', sortOrder: 2, contentType: 'video', estimatedTimeValue: 2, estimatedTimeUnit: 'hours', moduleId: 'mod-1', createdAt: new Date(), updatedAt: new Date() },
                ]),
              })),
            })),
          })),
        })),
      };
    });

    const lessonResult = await lessonService.listByModule('mod-1');
    const lessonList = lessonResult.data;
    expect(lessonList).toHaveLength(2);
    expect(lessonList[0].sortOrder).toBe(1);
    expect(lessonList[0].estimatedTimeValue).toBe(15);
    expect(lessonList[0].estimatedTimeUnit).toBe('minutes');
    expect(lessonList[1].sortOrder).toBe(2);
    expect(lessonList[1].estimatedTimeValue).toBe(2);
    expect(lessonList[1].estimatedTimeUnit).toBe('hours');
  });

  it('should verify full hierarchy listing: segment with modules ordered by sort_order', async () => {
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
      if (selectCallCount === 2) {
        // Count query for modules in segment
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          })),
        };
      }
      // Main listing query: return modules ordered by sort_order
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn().mockResolvedValue([
                  { id: 'mod-1', title: 'Module One', sortOrder: 1, segmentId: 'seg-1', lessonCount: 2, createdAt: new Date(), updatedAt: new Date() },
                  { id: 'mod-2', title: 'Module Two', sortOrder: 2, segmentId: 'seg-1', lessonCount: 1, createdAt: new Date(), updatedAt: new Date() },
                  { id: 'mod-3', title: 'Module Three', sortOrder: 3, segmentId: 'seg-1', lessonCount: 0, createdAt: new Date(), updatedAt: new Date() },
                ]),
              })),
            })),
          })),
        })),
      };
    });

    const moduleResult = await moduleService.listBySegment('seg-1');
    const moduleList = moduleResult.data;
    expect(moduleList).toHaveLength(3);
    expect(moduleList[0].sortOrder).toBe(1);
    expect(moduleList[0].title).toBe('Module One');
    expect(moduleList[1].sortOrder).toBe(2);
    expect(moduleList[2].sortOrder).toBe(3);
  });
});



// ============================================================================
// Test Suite 2: Referential Integrity
// ============================================================================

describe('Integration: Referential Integrity (HAS_CHILDREN rejection)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject deletion of a segment that has modules (HAS_CHILDREN error)', async () => {
    const existingSegment = {
      id: 'seg-with-modules',
      title: 'Segment With Modules',
      description: null,
      duration: 14,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Segment exists
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([existingSegment]),
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

    try {
      await segmentService.delete('seg-with-modules');
      expect.fail('Should have thrown HAS_CHILDREN error');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe('HAS_CHILDREN');
      expect(appErr.message).toContain('Cannot delete segment');
      expect(appErr.details).toEqual({ moduleCount: 3 });
    }
  });

  it('should reject deletion of a module that has lessons (HAS_CHILDREN error)', async () => {
    const existingModule = {
      id: 'mod-with-lessons',
      segmentId: 'seg-1',
      title: 'Module With Lessons',
      description: null,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Module exists
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([existingModule]),
            })),
          })),
        };
      }
      // Lesson count = 5
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        })),
      };
    });

    try {
      await moduleService.delete('mod-with-lessons');
      expect.fail('Should have thrown HAS_CHILDREN error');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.code).toBe('HAS_CHILDREN');
      expect(appErr.message).toContain('Cannot delete module');
      expect(appErr.details).toEqual({ lessonCount: 5 });
    }
  });

  it('should allow deletion of a segment with no modules', async () => {
    const existingSegment = {
      id: 'seg-empty',
      title: 'Empty Segment',
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
              limit: vi.fn().mockResolvedValue([existingSegment]),
            })),
          })),
        };
      }
      // Module count = 0
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        })),
      };
    });

    mocks.mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await expect(segmentService.delete('seg-empty')).resolves.toBeUndefined();
  });

  it('should allow deletion of a module with no lessons and reorder remaining', async () => {
    const existingModule = {
      id: 'mod-empty',
      segmentId: 'seg-1',
      title: 'Empty Module',
      description: null,
      sortOrder: 2,
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
      if (selectCallCount === 2) {
        // Lesson count = 0
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          })),
        };
      }
      // Remaining modules for reorder
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

    await expect(moduleService.delete('mod-empty')).resolves.toBeUndefined();
  });
});



// ============================================================================
// Test Suite 3: Auth Flow (Admin Guard)
// ============================================================================

describe('Integration: Auth Flow (admin-only endpoints reject non-admin and unauthenticated)', () => {
  function createMockReq(headers: Record<string, string> = {}): Request {
    return {
      headers,
      user: undefined,
    } as unknown as Request;
  }

  function createMockRes() {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
  }

  /**
   * Simulates the full admin guard chain: authenticate → requireAdmin.
   */
  function runAdminGuard(req: Request, res: Response): Promise<boolean> {
    return new Promise((resolve) => {
      const next: NextFunction = () => {
        requireAdmin(req, res, () => {
          resolve(true);
        });
      };

      authenticate(req, res, next);

      // If res.status was called, the chain was interrupted
      if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
        resolve(false);
      }
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow admin user through the auth guard chain', async () => {
    const token = jwt.sign({ userId: 'admin-001', role: 'admin' }, TEST_SECRET);
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(true);
    expect(req.user).toEqual({ userId: 'admin-001', role: 'admin' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject learner role with 403 Forbidden', async () => {
    const token = jwt.sign({ userId: 'learner-001', role: 'learner' }, TEST_SECRET);
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  });

  it('should reject unauthenticated request (no token) with 401', async () => {
    const req = createMockReq({});
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization token',
      },
    });
  });

  it('should reject invalid token with 401', async () => {
    const req = createMockReq({ authorization: 'Bearer invalid-token-here' });
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization token',
      },
    });
  });

  it('should reject expired token with 401', async () => {
    const token = jwt.sign(
      { userId: 'admin-001', role: 'admin' },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token has expired',
      },
    });
  });

  it('should reject token signed with wrong secret with 401', async () => {
    const token = jwt.sign({ userId: 'admin-001', role: 'admin' }, 'wrong-secret');
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization token',
      },
    });
  });

  it('should reject non-Bearer authorization format with 401', async () => {
    const req = createMockReq({ authorization: 'Basic abc123' });
    const res = createMockRes();

    const passed = await runAdminGuard(req, res);

    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});



// ============================================================================
// Test Suite 4: Assignment Flow
// ============================================================================

describe('Integration: Assignment Flow (assign → list → remove → verify)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full assignment lifecycle: assign, list (includes user), remove, list (excludes user)', async () => {
    const mockAssignment = {
      id: 'assign-1',
      userId: 'user-1',
      segmentId: 'seg-1',
      accessDurationDays: null,
      assignedAt: new Date('2024-03-01'),
    };

    // Step 1: Assign user to segment
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
      // No duplicate assignment
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      };
    });
    mocks.mockReturning.mockResolvedValueOnce([mockAssignment]);

    const assignment = await assignmentService.assign({
      userId: 'user-1',
      segmentId: 'seg-1',
    });

    expect(assignment.id).toBe('assign-1');
    expect(assignment.userId).toBe('user-1');
    expect(assignment.segmentId).toBe('seg-1');

    // Step 2: List by segment — should include the assigned user
    selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Segment exists
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
            })),
          })),
        };
      }
      if (selectCallCount === 2) {
        // Count query
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          })),
        };
      }
      // Return assigned users (paginated query with innerJoin)
      return {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue([
                    {
                      id: 'assign-1',
                      userId: 'user-1',
                      name: 'Test User',
                      email: 'test@example.com',
                      role: 'learner',
                      status: 'active',
                      assignedAt: new Date('2024-03-01'),
                      accessDurationDays: null,
                    },
                  ]),
                })),
              })),
            })),
          })),
        })),
      };
    });

    const assignmentResult = await assignmentService.listBySegment('seg-1');
    const assignedUsers = assignmentResult.data;
    expect(assignedUsers).toHaveLength(1);
    expect(assignedUsers[0].userId).toBe('user-1');
    expect(assignedUsers[0].name).toBe('Test User');

    // Step 3: Remove assignment
    selectCallCount = 0;
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

    // Step 4: List by segment again — should be empty (user excluded)
    selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Segment exists
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
            })),
          })),
        };
      }
      if (selectCallCount === 2) {
        // Count query
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          })),
        };
      }
      // Empty paginated result
      return {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      };
    });

    const emptyResult = await assignmentService.listBySegment('seg-1');
    expect(emptyResult.data).toHaveLength(0);
  });

  it('should reject duplicate assignment with 409 CONFLICT', async () => {
    let selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            })),
          })),
        };
      }
      if (selectCallCount === 2) {
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
            limit: vi.fn().mockResolvedValue([{ id: 'existing-assign', assignedAt: new Date() }]),
          })),
        })),
      };
    });

    try {
      await assignmentService.assign({ userId: 'user-1', segmentId: 'seg-1' });
      expect.fail('Should have thrown CONFLICT error');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(409);
      expect(appErr.code).toBe('CONFLICT');
      expect(appErr.message).toBe('Assignment already exists');
    }
  });

  it('should reject assignment when user does not exist with 404', async () => {
    mocks.mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    }));

    try {
      await assignmentService.assign({ userId: 'non-existent', segmentId: 'seg-1' });
      expect.fail('Should have thrown NOT_FOUND error');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(404);
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.message).toBe('User not found');
    }
  });

  it('should reject assignment when segment does not exist with 404', async () => {
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

    try {
      await assignmentService.assign({ userId: 'user-1', segmentId: 'non-existent' });
      expect.fail('Should have thrown NOT_FOUND error');
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(404);
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.message).toBe('Segment not found');
    }
  });
});



// ============================================================================
// Test Suite 5: Dashboard Stats Accuracy
// ============================================================================

describe('Integration: Dashboard Stats Accuracy After Entity Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return accurate counts after creating segments, modules, lessons, and users', async () => {
    const mockFrom = vi.fn()
      .mockResolvedValueOnce([{ count: 3 }])   // 3 segments
      .mockResolvedValueOnce([{ count: 7 }])   // 7 modules
      .mockResolvedValueOnce([{ count: 15 }])  // 15 lessons
      .mockResolvedValueOnce([{ count: 10 }]); // 10 users

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { default: adminRouter } = await import('../routes/admin.routes.js');

    // Find the dashboard/stats route handler
    const layer = adminRouter.stack.find(
      (l: { route?: { path: string; methods: { get?: boolean } } }) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    expect(layer).toBeDefined();

    const handler = layer!.route!.stack[0].handle;
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const mockNext: NextFunction = vi.fn();

    await handler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalSegments: 3,
        totalModules: 7,
        totalLessons: 15,
        totalUsers: 10,
      },
    });
  });

  it('should return zero counts when no entities exist', async () => {
    const mockFrom = vi.fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { default: adminRouter } = await import('../routes/admin.routes.js');

    const layer = adminRouter.stack.find(
      (l: { route?: { path: string; methods: { get?: boolean } } }) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    const handler = layer!.route!.stack[0].handle;
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const mockNext: NextFunction = vi.fn();

    await handler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalSegments: 0,
        totalModules: 0,
        totalLessons: 0,
        totalUsers: 0,
      },
    });
  });

  it('should reflect incremented counts after entity creation', async () => {
    // Simulate state after creating 1 segment, 2 modules, 4 lessons, 5 users
    const mockFrom = vi.fn()
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 4 }])
      .mockResolvedValueOnce([{ count: 5 }]);

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { default: adminRouter } = await import('../routes/admin.routes.js');

    const layer = adminRouter.stack.find(
      (l: { route?: { path: string; methods: { get?: boolean } } }) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    const handler = layer!.route!.stack[0].handle;
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const mockNext: NextFunction = vi.fn();

    await handler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalSegments: 1,
        totalModules: 2,
        totalLessons: 4,
        totalUsers: 5,
      },
    });
  });
});



// ============================================================================
// Test Suite 6: Data Readiness for M3 and M4
// ============================================================================

describe('Integration: Data Readiness for M3 Learner Viewing and M4 Quiz Association', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify segment getById includes duration and moduleCount for M3 consumption', async () => {
    const mockSegment = {
      id: 'seg-m3',
      title: 'Segment for Learner',
      description: 'Ready for M3',
      duration: 45,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Segment query
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([mockSegment]),
            })),
          })),
        };
      }
      // Module count query
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        })),
      };
    });

    const result = await segmentService.getById('seg-m3');

    // M3 needs: id, title, description, duration, status, moduleCount
    expect(result.id).toBe('seg-m3');
    expect(result.title).toBe('Segment for Learner');
    expect(result.description).toBe('Ready for M3');
    expect(result.duration).toBe(45);
    expect(result.status).toBe('active');
    expect(result.moduleCount).toBe(3);
  });

  it('should verify lesson getById includes all fields needed for M3 viewing and M4 quiz association', async () => {
    const mockLesson = {
      id: 'lesson-m3',
      moduleId: 'mod-1',
      title: 'Lesson for Learner',
      contentType: 'text',
      contentBody: 'Full lesson content here for the learner to read',
      videoUrl: null,
      estimatedTimeValue: 30,
      estimatedTimeUnit: 'minutes',
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([mockLesson]),
        })),
      })),
    }));

    const result = await lessonService.getById('lesson-m3');

    // M3 needs: id, moduleId, title, contentType, contentBody/videoUrl, estimatedTimeValue/Unit, sortOrder
    expect(result.id).toBe('lesson-m3');
    expect(result.moduleId).toBe('mod-1');
    expect(result.title).toBe('Lesson for Learner');
    expect(result.contentType).toBe('text');
    expect(result.contentBody).toBe('Full lesson content here for the learner to read');
    expect(result.estimatedTimeValue).toBe(30);
    expect(result.estimatedTimeUnit).toBe('minutes');
    expect(result.sortOrder).toBe(1);

    // M4 needs: id and moduleId to associate quizzes
    expect(result.id).toBeDefined();
    expect(result.moduleId).toBeDefined();
  });

  it('should verify video lesson getById returns video_url for M3 viewing', async () => {
    const mockVideoLesson = {
      id: 'lesson-video',
      moduleId: 'mod-1',
      title: 'Video Lesson',
      contentType: 'video',
      contentBody: null,
      videoUrl: 'https://example.com/learning-video.mp4',
      estimatedTimeValue: 1,
      estimatedTimeUnit: 'hours',
      sortOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.mockSelect.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([mockVideoLesson]),
        })),
      })),
    }));

    const result = await lessonService.getById('lesson-video');

    expect(result.contentType).toBe('video');
    expect(result.videoUrl).toBe('https://example.com/learning-video.mp4');
    expect(result.estimatedTimeValue).toBe(1);
    expect(result.estimatedTimeUnit).toBe('hours');
  });

  it('should verify assignment structure includes accessDurationDays for M3 access control', async () => {
    const mockAssignment = {
      id: 'assign-m3',
      userId: 'user-1',
      segmentId: 'seg-1',
      accessDurationDays: 90,
      assignedAt: new Date('2024-03-01'),
    };

    let selectCallCount = 0;
    mocks.mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
            })),
          })),
        };
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: 'seg-1' }]),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      };
    });
    mocks.mockReturning.mockResolvedValueOnce([mockAssignment]);

    const result = await assignmentService.assign({
      userId: 'user-1',
      segmentId: 'seg-1',
      accessDurationDays: 90,
    });

    // M3 needs accessDurationDays for per-user access window enforcement
    expect(result.accessDurationDays).toBe(90);
    expect(result.assignedAt).toBeDefined();
    expect(result.userId).toBe('user-1');
    expect(result.segmentId).toBe('seg-1');
  });
});
