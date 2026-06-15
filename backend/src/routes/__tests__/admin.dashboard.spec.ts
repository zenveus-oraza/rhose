import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock the db module before importing the router
vi.mock('../../db/index.js', () => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    db: { select: mockSelect },
    __mockSelect: mockSelect,
    __mockFrom: mockFrom,
    __mockWhere: mockWhere,
  };
});

// Mock auth middleware to pass through
vi.mock('../../middleware/auth.js', () => ({
  authenticate: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock env
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    DATABASE_URL: 'postgres://test',
    PORT: 3000,
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

import { db } from '../../db/index.js';

describe('GET /api/admin/dashboard/stats', () => {
  let mockReq: Request;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {} as Request;
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    mockNext = vi.fn();
  });

  it('returns total counts for segments, modules, lessons, and users', async () => {
    // The route does: db.select({count}).from(table).where(...) for segments
    // and db.select({count}).from(table) for modules/lessons/users
    // Plus a db.select(...).from(sql`...`).where(sql`...`) for ending soon
    const mockWhere = vi.fn()
      .mockResolvedValueOnce([{ count: 5 }])  // segments (has .where)
      .mockResolvedValueOnce([{ count: 1 }]); // endingSoon (has .where)
    const mockFrom = vi.fn(() => ({ where: mockWhere }));

    // For modules, lessons, users — .from() resolves directly (no .where call)
    // We need a smarter mock: from() returns { where } but also resolves as promise
    // Actually the route destructures [result] = await db.select().from() for modules/lessons/users
    // So from() must be thenable for those calls
    let callIndex = 0;
    const smartFrom = vi.fn().mockImplementation(() => {
      callIndex++;
      // Call 1: segments -> needs .where()
      // Calls 2,3,4: modules, lessons, users -> resolves directly
      // Call 5: endingSoon -> needs .where()
      if (callIndex === 1) {
        return { where: vi.fn().mockResolvedValue([{ count: 5 }]) };
      } else if (callIndex === 2) {
        return Promise.resolve([{ count: 12 }]);
      } else if (callIndex === 3) {
        return Promise.resolve([{ count: 30 }]);
      } else if (callIndex === 4) {
        return Promise.resolve([{ count: 8 }]);
      } else {
        // endingSoon query
        return { where: vi.fn().mockResolvedValue([{ count: 1 }]) };
      }
    });

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: smartFrom });

    // Import the router and extract the handler
    const { default: adminRouter } = await import('../admin.routes.js');

    // Find the dashboard/stats route handler
    const layer = adminRouter.stack.find(
      (l: any) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    expect(layer).toBeDefined();

    // The route has authenticate + requireAdmin middleware, then the handler
    // Find the actual handler (last in the stack)
    const routeStack = layer!.route!.stack;
    const handler = routeStack[routeStack.length - 1].handle;
    await handler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalSegments: 5,
        totalModules: 12,
        totalLessons: 30,
        totalUsers: 8,
        endingSoonCount: 1,
      },
    });
  });

  it('returns zero counts when tables are empty', async () => {
    let callIndex = 0;
    const smartFrom = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return { where: vi.fn().mockResolvedValue([{ count: 0 }]) };
      } else if (callIndex <= 4) {
        return Promise.resolve([{ count: 0 }]);
      } else {
        return { where: vi.fn().mockResolvedValue([{ count: 0 }]) };
      }
    });

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: smartFrom });

    const { default: adminRouter } = await import('../admin.routes.js');

    const layer = adminRouter.stack.find(
      (l: any) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    const routeStack = layer!.route!.stack;
    const handler = routeStack[routeStack.length - 1].handle;
    await handler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalSegments: 0,
        totalModules: 0,
        totalLessons: 0,
        totalUsers: 0,
        endingSoonCount: 0,
      },
    });
  });

  it('calls next with error when database query fails', async () => {
    const dbError = new Error('Database connection failed');
    const smartFrom = vi.fn().mockImplementation(() => {
      return { where: vi.fn().mockRejectedValue(dbError) };
    });

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: smartFrom });

    const { default: adminRouter } = await import('../admin.routes.js');

    const layer = adminRouter.stack.find(
      (l: any) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    const routeStack = layer!.route!.stack;
    const handler = routeStack[routeStack.length - 1].handle;
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
  });
});
