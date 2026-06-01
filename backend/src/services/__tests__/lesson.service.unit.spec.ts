import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../utils/AppError.js';
import { createLessonSchema, updateLessonSchema } from '../../schemas/lesson.schemas.js';

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
import { lessonService } from '../lesson.service.js';
import { db } from '../../db/index.js';

// Helper to access mock internals
const mocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

describe('Lesson Service — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a text lesson with content_body and auto-assigned sort_order', async () => {
      const mockLesson = {
        id: 'lesson-1',
        moduleId: 'mod-1',
        title: 'Text Lesson',
        contentType: 'text',
        contentBody: 'This is the lesson content',
        videoUrl: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
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
        // Get max sort_order (no existing lessons)
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ maxOrder: 0 }]),
          })),
        };
      });

      mocks.mockReturning.mockResolvedValue([mockLesson]);

      const result = await lessonService.create('mod-1', {
        title: 'Text Lesson',
        content_type: 'text',
        content_body: 'This is the lesson content',
      });

      expect(result).toEqual(mockLesson);
      expect(result.sortOrder).toBe(1);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        moduleId: 'mod-1',
        title: 'Text Lesson',
        contentType: 'text',
        contentBody: 'This is the lesson content',
        videoUrl: null,
        sortOrder: 1,
      });
    });

    it('should create a video lesson with valid video_url', async () => {
      const mockLesson = {
        id: 'lesson-2',
        moduleId: 'mod-1',
        title: 'Video Lesson',
        contentType: 'video',
        contentBody: null,
        videoUrl: 'https://www.youtube.com/watch?v=abc123',
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
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
        // Get max sort_order (1 existing lesson)
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ maxOrder: 1 }]),
          })),
        };
      });

      mocks.mockReturning.mockResolvedValue([mockLesson]);

      const result = await lessonService.create('mod-1', {
        title: 'Video Lesson',
        content_type: 'video',
        video_url: 'https://www.youtube.com/watch?v=abc123',
      });

      expect(result).toEqual(mockLesson);
      expect(result.sortOrder).toBe(2);
      expect(mocks.mockValues).toHaveBeenCalledWith({
        moduleId: 'mod-1',
        title: 'Video Lesson',
        contentType: 'video',
        contentBody: null,
        videoUrl: 'https://www.youtube.com/watch?v=abc123',
        sortOrder: 2,
      });
    });

    it('should throw 404 when parent module does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        lessonService.create('non-existent-mod', {
          title: 'Lesson',
          content_type: 'text',
          content_body: 'Content',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Parent module does not exist',
      });
    });
  });

  describe('delete', () => {
    it('should delete a lesson and reorder remaining lessons', async () => {
      const existingLesson = {
        id: 'lesson-2',
        moduleId: 'mod-1',
        title: 'Lesson 2',
        contentType: 'text',
        contentBody: 'Content',
        videoUrl: null,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let selectCallCount = 0;
      mocks.mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Find lesson
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([existingLesson]),
              })),
            })),
          };
        }
        // Remaining lessons after deletion (for reorder)
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([
                { id: 'lesson-1' },
                { id: 'lesson-3' },
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

      await expect(lessonService.delete('lesson-2')).resolves.toBeUndefined();
      expect(mocks.mockDelete).toHaveBeenCalled();
      // Update should be called twice (once per remaining lesson to reorder)
      expect(mocks.mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('should throw 404 when deleting a non-existent lesson', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(lessonService.delete('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('listByModule', () => {
    it('should throw 404 when module does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(lessonService.listByModule('non-existent-mod')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Parent module does not exist',
      });
    });
  });

  describe('getById', () => {
    it('should throw 404 when lesson does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(lessonService.getById('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('update', () => {
    it('should throw 404 when lesson does not exist', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        lessonService.update('non-existent', { title: 'New Title' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should update lesson and return updated record', async () => {
      const existingLesson = {
        id: 'lesson-1',
        moduleId: 'mod-1',
        title: 'Old Title',
        contentType: 'text',
        contentBody: 'Content',
        videoUrl: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedLesson = {
        ...existingLesson,
        title: 'New Title',
        updatedAt: new Date(),
      };

      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([existingLesson]),
          })),
        })),
      }));

      mocks.mockUpdateSet.mockReturnValue({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([updatedLesson]),
        })),
      });
      mocks.mockUpdate.mockReturnValue({ set: mocks.mockUpdateSet });

      const result = await lessonService.update('lesson-1', { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });
  });

  describe('reorder', () => {
    it('should assign contiguous sort_order values starting from 1', async () => {
      const orderedIds = ['lesson-c', 'lesson-a', 'lesson-b'];

      let selectCallCount = 0;
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
        // Get existing lessons in module
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              { id: 'lesson-a' },
              { id: 'lesson-b' },
              { id: 'lesson-c' },
            ]),
          })),
        };
      });

      const updateSetMock = vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      }));
      mocks.mockUpdate.mockReturnValue({ set: updateSetMock });

      await lessonService.reorder('mod-1', orderedIds);

      // Should have called update 3 times (once per lesson)
      expect(mocks.mockUpdate).toHaveBeenCalledTimes(3);
      // Verify sort_order assignments
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

    it('should throw 404 when module does not exist for reorder', async () => {
      mocks.mockSelect.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

      await expect(
        lessonService.reorder('non-existent-mod', ['lesson-1'])
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});

describe('Lesson Schemas — Zod Validation', () => {
  describe('createLessonSchema', () => {
    it('should accept valid text lesson with content_body', () => {
      const result = createLessonSchema.safeParse({
        title: 'Text Lesson',
        content_type: 'text',
        content_body: 'This is the lesson content body.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject text lesson without content_body', () => {
      const result = createLessonSchema.safeParse({
        title: 'Text Lesson',
        content_type: 'text',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // The error should reference the content_body field (via path or message)
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths.some((p) => p.includes('content_body'))).toBe(true);
      }
    });

    it('should reject text lesson with empty content_body', () => {
      const result = createLessonSchema.safeParse({
        title: 'Text Lesson',
        content_type: 'text',
        content_body: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid video lesson with video_url', () => {
      const result = createLessonSchema.safeParse({
        title: 'Video Lesson',
        content_type: 'video',
        video_url: 'https://www.youtube.com/watch?v=abc123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject video lesson without video_url', () => {
      const result = createLessonSchema.safeParse({
        title: 'Video Lesson',
        content_type: 'video',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // The error should reference the video_url field (via path or message)
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths.some((p) => p.includes('video_url'))).toBe(true);
      }
    });

    it('should reject video lesson with invalid URL format', () => {
      const result = createLessonSchema.safeParse({
        title: 'Video Lesson',
        content_type: 'video',
        video_url: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.toLowerCase().includes('url'))).toBe(true);
      }
    });

    it('should reject lesson with missing title', () => {
      const result = createLessonSchema.safeParse({
        content_type: 'text',
        content_body: 'Some content',
      });
      expect(result.success).toBe(false);
    });

    it('should reject lesson with invalid content_type', () => {
      const result = createLessonSchema.safeParse({
        title: 'Lesson',
        content_type: 'audio',
        content_body: 'Some content',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateLessonSchema', () => {
    it('should accept partial update with just title', () => {
      const result = updateLessonSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should reject update changing to text without content_body', () => {
      const result = updateLessonSchema.safeParse({
        content_type: 'text',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.toLowerCase().includes('content_body'))).toBe(true);
      }
    });

    it('should reject update changing to video without video_url', () => {
      const result = updateLessonSchema.safeParse({
        content_type: 'video',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.toLowerCase().includes('video_url'))).toBe(true);
      }
    });

    it('should reject update with invalid video_url format', () => {
      const result = updateLessonSchema.safeParse({
        content_type: 'video',
        video_url: 'invalid-url-format',
      });
      expect(result.success).toBe(false);
    });

    it('should accept update changing to video with valid video_url', () => {
      const result = updateLessonSchema.safeParse({
        content_type: 'video',
        video_url: 'https://vimeo.com/12345',
      });
      expect(result.success).toBe(true);
    });

    it('should accept update changing to text with content_body', () => {
      const result = updateLessonSchema.safeParse({
        content_type: 'text',
        content_body: 'New content body',
      });
      expect(result.success).toBe(true);
    });
  });
});
