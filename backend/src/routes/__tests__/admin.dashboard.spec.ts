import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock the db module before importing the router
vi.mock('../../db/index.js', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    db: { select: mockSelect },
    __mockSelect: mockSelect,
    __mockFrom: mockFrom,
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
    // Setup mock to return different counts for each table
    const mockFrom = vi.fn()
      .mockResolvedValueOnce([{ count: 5 }])   // segments
      .mockResolvedValueOnce([{ count: 12 }])  // modules
      .mockResolvedValueOnce([{ count: 30 }])  // lessons
      .mockResolvedValueOnce([{ count: 8 }]);  // users

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    // Import the router and extract the handler
    const { default: adminRouter } = await import('../admin.routes.js');

    // Find the dashboard/stats route handler
    const layer = adminRouter.stack.find(
      (l: { route?: { path: string; methods: { get?: boolean } } }) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    expect(layer).toBeDefined();

    const handler = layer!.route!.stack[0].handle;
    await handler(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        totalSegments: 5,
        totalModules: 12,
        totalLessons: 30,
        totalUsers: 8,
      },
    });
  });

  it('returns zero counts when tables are empty', async () => {
    const mockFrom = vi.fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { default: adminRouter } = await import('../admin.routes.js');

    const layer = adminRouter.stack.find(
      (l: { route?: { path: string; methods: { get?: boolean } } }) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    const handler = layer!.route!.stack[0].handle;
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

  it('calls next with error when database query fails', async () => {
    const dbError = new Error('Database connection failed');
    const mockFrom = vi.fn().mockRejectedValueOnce(dbError);

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const { default: adminRouter } = await import('../admin.routes.js');

    const layer = adminRouter.stack.find(
      (l: { route?: { path: string; methods: { get?: boolean } } }) =>
        l.route?.path === '/dashboard/stats' && l.route?.methods?.get
    );

    const handler = layer!.route!.stack[0].handle;
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
  });
});
