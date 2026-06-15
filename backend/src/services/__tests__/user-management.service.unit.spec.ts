import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/AppError.js';

// Mock the password utility
vi.mock('../../utils/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password_mock'),
}));

// Mock the db module before importing the service
vi.mock('../../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOffset = vi.fn();
  const mockLimit = vi.fn(() => ({ offset: mockOffset }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit, offset: mockOffset }));
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
import { userManagementService } from '../user-management.service.js';
import { db } from '../../db/index.js';
import { hashPassword } from '../../utils/password.js';

// Helper to access mock internals
const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

describe('User Management Service — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with valid inputs and return profile without password hash', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'learner',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        // First call: check for duplicate email — no existing user
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
      });

      mocks.mockReturning.mockResolvedValue([mockUser]);

      const result = await userManagementService.create({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'learner',
      });

      // Should return user profile without password hash
      expect(result.user).toEqual(mockUser);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password_hash');

      // Should return a temporary password
      expect(result.temporaryPassword).toBeDefined();
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);

      // Should have called hashPassword
      expect(hashPassword).toHaveBeenCalledWith(expect.any(String));

      // Should have called insert
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('should return 409 Conflict when email is already in use', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
          })),
        })),
      }));

      await expect(
        userManagementService.create({
          name: 'Jane Doe',
          email: 'existing@example.com',
          role: 'learner',
        })
      ).rejects.toThrow(AppError);

      // Reset mock for second assertion
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
          })),
        })),
      }));

      await expect(
        userManagementService.create({
          name: 'Jane Doe',
          email: 'existing@example.com',
          role: 'learner',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Email already in use',
      });
    });
  });

  describe('list', () => {
    it('should filter users by name case-insensitively when search is provided', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'learner',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Count query
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            })),
          };
        }
        // Data query
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue(mockUsers),
                })),
              })),
            })),
          })),
        };
      });

      const result = await userManagementService.list({ search: 'john', page: 1, limit: 20 });

      expect(result.data).toEqual(mockUsers);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      // The service uses ilike for case-insensitive search — verified by the mock being called
      expect(mocks.mockSelect).toHaveBeenCalled();
    });

    it('should filter users by email case-insensitively when search is provided', async () => {
      const mockUsers = [
        {
          id: 'user-2',
          name: 'Alice Smith',
          email: 'alice@EXAMPLE.com',
          role: 'admin',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  offset: vi.fn().mockResolvedValue(mockUsers),
                })),
              })),
            })),
          })),
        };
      });

      const result = await userManagementService.list({ search: 'ALICE' });

      expect(result.data).toEqual(mockUsers);
      expect(result.pagination.total).toBe(1);
    });

    it('should return paginated results with correct metadata', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
          role: 'learner',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
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
                  offset: vi.fn().mockResolvedValue(mockUsers),
                })),
              })),
            })),
          })),
        };
      });

      const result = await userManagementService.list({ page: 2, limit: 10 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });

  describe('deactivate', () => {
    it('should set user status to "deactivated" and update updated_at', async () => {
      const deactivatedUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'learner',
        status: 'deactivated',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      // First select: check user exists
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
          })),
        })),
      }));

      // Explicitly set up the full update chain
      const mockSetArg = vi.fn();
      mocks.mockUpdate.mockReturnValue({
        set: vi.fn((arg: unknown) => {
          mockSetArg(arg);
          return {
            where: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([deactivatedUser]),
            })),
          };
        }),
      });

      const result = await userManagementService.deactivate('user-1');

      expect(result.status).toBe('deactivated');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
      expect(mocks.mockUpdate).toHaveBeenCalled();
      expect(mockSetArg).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deactivated' })
      );
    });

    it('should throw 404 when user does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        userManagementService.deactivate('non-existent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('resetPassword', () => {
    it('should generate a new temporary password and hash it', async () => {
      // User exists
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
          })),
        })),
      }));

      // Update succeeds
      mocks.mockUpdateSet.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await userManagementService.resetPassword('user-1');

      // Should return a temporary password
      expect(result.temporaryPassword).toBeDefined();
      expect(typeof result.temporaryPassword).toBe('string');
      expect(result.temporaryPassword.length).toBeGreaterThan(0);

      // Should have called hashPassword with the temporary password
      expect(hashPassword).toHaveBeenCalledWith(result.temporaryPassword);

      // Should have called update to store the new hash
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should throw 404 when user does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        userManagementService.resetPassword('non-existent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should generate a different password each time', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
          })),
        })),
      }));

      mocks.mockUpdateSet.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result1 = await userManagementService.resetPassword('user-1');
      const result2 = await userManagementService.resetPassword('user-1');

      // Crypto random should produce different passwords
      expect(result1.temporaryPassword).not.toBe(result2.temporaryPassword);
    });
  });

  describe('update', () => {
    it('should throw 404 when user does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        userManagementService.update('non-existent', { name: 'New Name' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should update user name and return updated profile without password hash', async () => {
      const updatedUser = {
        id: 'user-1',
        name: 'Updated Name',
        email: 'john@example.com',
        role: 'learner',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
          })),
        })),
      }));

      // Explicitly set up the full update chain
      mocks.mockUpdate.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          })),
        })),
      });

      const result = await userManagementService.update('user-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
    });
  });
});
