import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing the service
vi.mock('../../db/index.js', () => {
  const mockValues = vi.fn().mockResolvedValue(undefined);
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockDynamic = vi.fn();
  const mockLimit = vi.fn(() => ({ $dynamic: mockDynamic }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockInnerJoin = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      _mocks: {
        mockInsert,
        mockValues,
        mockSelect,
        mockFrom,
        mockInnerJoin,
        mockOrderBy,
        mockLimit,
        mockDynamic,
      },
    },
  };
});

// Import after mocking
import { activityService } from '../activity.service.js';
import { db } from '../../db/index.js';

const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

describe('Activity Service — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should insert an activity event into the database', async () => {
      mocks.mockValues.mockResolvedValue(undefined);

      await activityService.trackEvent({
        userId: 'user-1',
        action: 'lesson_completed',
        description: 'Completed Module 2',
        detail: 'Instrument Sterilization',
      });

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'lesson_completed',
        description: 'Completed Module 2',
        detail: 'Instrument Sterilization',
        metadata: null,
      });
    });

    it('should store metadata when provided', async () => {
      mocks.mockValues.mockResolvedValue(undefined);

      await activityService.trackEvent({
        userId: 'user-2',
        action: 'quiz_passed',
        description: 'Passed the quiz "Packaging Standards"',
        detail: 'Packaging Standards',
        metadata: { score: 8, totalQuestions: 10 },
      });

      expect(mocks.mockValues).toHaveBeenCalledWith({
        userId: 'user-2',
        action: 'quiz_passed',
        description: 'Passed the quiz "Packaging Standards"',
        detail: 'Packaging Standards',
        metadata: { score: 8, totalQuestions: 10 },
      });
    });

    it('should default detail and metadata to null when not provided', async () => {
      mocks.mockValues.mockResolvedValue(undefined);

      await activityService.trackEvent({
        userId: 'user-3',
        action: 'user_created',
        description: 'Account created',
      });

      expect(mocks.mockValues).toHaveBeenCalledWith({
        userId: 'user-3',
        action: 'user_created',
        description: 'Account created',
        detail: null,
        metadata: null,
      });
    });
  });

  describe('getRecentActivity', () => {
    it('should return formatted activity items with abbreviated names', async () => {
      const mockRows = [
        {
          id: 'evt-1',
          userId: 'user-1',
          action: 'lesson_completed',
          description: 'Completed Module 2',
          detail: 'Instrument Sterilization',
          metadata: null,
          createdAt: new Date('2024-03-15T10:30:00Z'),
          userName: 'Amaka Okafor',
          userAvatar: 'https://example.com/avatar.jpg',
        },
        {
          id: 'evt-2',
          userId: 'user-2',
          action: 'quiz_passed',
          description: 'Passed the quiz',
          detail: 'Packaging Standards',
          metadata: { score: 8, totalQuestions: 10 },
          createdAt: new Date('2024-03-15T09:00:00Z'),
          userName: 'Chinwe Uzoma',
          userAvatar: null,
        },
      ];

      mocks.mockDynamic.mockResolvedValue(mockRows);

      const result = await activityService.getRecentActivity({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'evt-1',
        userId: 'user-1',
        userName: 'Amaka O.',
        userAvatar: 'https://example.com/avatar.jpg',
        action: 'lesson_completed',
        description: 'Completed Module 2',
        detail: 'Instrument Sterilization',
        score: undefined,
        createdAt: '2024-03-15T10:30:00.000Z',
      });
      expect(result[1]).toEqual({
        id: 'evt-2',
        userId: 'user-2',
        userName: 'Chinwe U.',
        userAvatar: null,
        action: 'quiz_passed',
        description: 'Passed the quiz',
        detail: 'Packaging Standards',
        score: '8/10',
        createdAt: '2024-03-15T09:00:00.000Z',
      });
    });

    it('should handle single-word names without abbreviation', async () => {
      const mockRows = [
        {
          id: 'evt-3',
          userId: 'user-3',
          action: 'user_created',
          description: 'Account created',
          detail: null,
          metadata: null,
          createdAt: new Date('2024-03-14T08:00:00Z'),
          userName: 'Victor',
          userAvatar: null,
        },
      ];

      mocks.mockDynamic.mockResolvedValue(mockRows);

      const result = await activityService.getRecentActivity({ limit: 5 });

      expect(result[0].userName).toBe('Victor');
    });

    it('should pass filter to query when provided and not "all"', async () => {
      mocks.mockDynamic.mockResolvedValue([]);

      // The $dynamic() method with where called before resolution
      const mockWhereOnDynamic = vi.fn().mockResolvedValue([]);
      mocks.mockDynamic.mockReturnValue({ where: mockWhereOnDynamic });

      await activityService.getRecentActivity({ limit: 10, filter: 'quiz_passed' });

      // The filter should trigger a .where() call on the dynamic query
      expect(mockWhereOnDynamic).toHaveBeenCalled();
    });

    it('should not filter when filter is "all"', async () => {
      mocks.mockDynamic.mockResolvedValue([]);

      const result = await activityService.getRecentActivity({ limit: 10, filter: 'all' });

      expect(result).toEqual([]);
      // The $dynamic() resolved directly without .where() being called
    });

    it('should extract score from metadata when score and totalQuestions exist', async () => {
      const mockRows = [
        {
          id: 'evt-4',
          userId: 'user-4',
          action: 'quiz_failed',
          description: 'Failed the quiz',
          detail: 'Quiz Name',
          metadata: { score: 3, totalQuestions: 10 },
          createdAt: new Date('2024-03-15T12:00:00Z'),
          userName: 'John Doe',
          userAvatar: null,
        },
      ];

      mocks.mockDynamic.mockResolvedValue(mockRows);

      const result = await activityService.getRecentActivity({ limit: 5 });

      expect(result[0].score).toBe('3/10');
    });
  });
});
