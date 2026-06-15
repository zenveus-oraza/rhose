import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as quizService from './quiz.service';
import * as api from './api';

vi.mock('./api', () => ({
  apiClient: vi.fn(),
}));

const mockApiClient = vi.mocked(api.apiClient);

describe('quiz.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Admin Quiz API ─────────────────────────────────────────────────────────

  describe('createOrUpdateQuiz', () => {
    it('sends POST to /admin/segments/:segmentId/quiz with body', async () => {
      const data = {
        title: 'Test Quiz',
        questions: [
          {
            question_text: 'What is 2+2?',
            question_type: 'single_select' as const,
            options: [
              { option_text: '3', is_correct: false },
              { option_text: '4', is_correct: true },
            ],
          },
        ],
      };
      const quiz = { id: 'q1', title: 'Test Quiz', segmentId: 'seg-1', questions: [] };
      mockApiClient.mockResolvedValue(quiz);

      const result = await quizService.createOrUpdateQuiz('seg-1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-1/quiz', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(quiz);
    });
  });

  describe('getSegmentQuiz', () => {
    it('sends GET to /admin/segments/:segmentId/quiz', async () => {
      const quiz = {
        id: 'q1',
        title: 'Segment Quiz',
        description: null,
        segmentId: 'seg-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        questions: [],
      };
      mockApiClient.mockResolvedValue(quiz);

      const result = await quizService.getSegmentQuiz('seg-1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-1/quiz');
      expect(result).toEqual(quiz);
    });

    it('returns null when no quiz exists', async () => {
      mockApiClient.mockResolvedValue(null);

      const result = await quizService.getSegmentQuiz('seg-2');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-2/quiz');
      expect(result).toBeNull();
    });
  });

  describe('deleteSegmentQuiz', () => {
    it('sends DELETE to /admin/segments/:segmentId/quiz', async () => {
      mockApiClient.mockResolvedValue({ message: 'Quiz deleted successfully' });

      await quizService.deleteSegmentQuiz('seg-1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-1/quiz', {
        method: 'DELETE',
      });
    });
  });

  // ─── Learner Quiz API ───────────────────────────────────────────────────────

  describe('getQuizForTaking', () => {
    it('sends GET to /learner/segments/:segmentId/quiz', async () => {
      const quiz = {
        id: 'q1',
        title: 'Segment Quiz',
        description: null,
        segmentId: 'seg-1',
        questions: [
          {
            id: 'qst-1',
            questionText: 'What is 2+2?',
            questionType: 'single_select',
            sortOrder: 1,
            options: [
              { id: 'opt-1', optionText: '3', sortOrder: 1 },
              { id: 'opt-2', optionText: '4', sortOrder: 2 },
            ],
          },
        ],
      };
      mockApiClient.mockResolvedValue(quiz);

      const result = await quizService.getQuizForTaking('seg-1');

      expect(mockApiClient).toHaveBeenCalledWith('/learner/segments/seg-1/quiz');
      expect(result).toEqual(quiz);
    });

    it('returns null when no quiz exists', async () => {
      mockApiClient.mockResolvedValue(null);

      const result = await quizService.getQuizForTaking('seg-2');

      expect(result).toBeNull();
    });
  });

  describe('submitQuizAttempt', () => {
    it('sends POST to /learner/segments/:segmentId/quiz/attempts with answers', async () => {
      const data = {
        answers: [
          { question_id: 'qst-1', selected_option_ids: ['opt-2'] },
        ],
      };
      const attemptResult = {
        attemptId: 'att-1',
        score: 1,
        totalQuestions: 1,
        percentage: 100,
        passed: true,
      };
      mockApiClient.mockResolvedValue(attemptResult);

      const response = await quizService.submitQuizAttempt('seg-1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/learner/segments/seg-1/quiz/attempts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(response).toEqual(attemptResult);
    });
  });

  describe('getAttemptHistory', () => {
    it('sends GET and extracts attempts array from response', async () => {
      const attempts = [
        { id: 'att-1', score: 8, totalQuestions: 10, percentage: 80, completedAt: '2024-01-01' },
        { id: 'att-2', score: 6, totalQuestions: 10, percentage: 60, completedAt: '2024-01-02' },
      ];
      mockApiClient.mockResolvedValue({ attempts });

      const result = await quizService.getAttemptHistory('seg-1');

      expect(mockApiClient).toHaveBeenCalledWith('/learner/segments/seg-1/quiz/attempts');
      expect(result).toEqual(attempts);
    });
  });

  describe('getAttemptDetail', () => {
    it('sends GET to /learner/segments/:segmentId/quiz/attempts/:attemptId', async () => {
      const detail = {
        id: 'att-1',
        score: 1,
        totalQuestions: 1,
        percentage: 100,
        completedAt: '2024-01-01',
        answers: [
          {
            questionId: 'qst-1',
            questionText: 'What is 2+2?',
            questionType: 'single_select',
            selectedOptions: [{ id: 'opt-2', optionText: '4' }],
            correctOptions: [{ id: 'opt-2', optionText: '4' }],
            isCorrect: true,
          },
        ],
      };
      mockApiClient.mockResolvedValue(detail);

      const result = await quizService.getAttemptDetail('seg-1', 'att-1');

      expect(mockApiClient).toHaveBeenCalledWith('/learner/segments/seg-1/quiz/attempts/att-1');
      expect(result).toEqual(detail);
    });
  });

  // ─── Activity API ───────────────────────────────────────────────────────────

  describe('getRecentActivity', () => {
    it('sends GET to /admin/activity without params when no options', async () => {
      const items = [
        {
          id: 'ev-1',
          userId: 'u1',
          userName: 'Amaka O.',
          userAvatar: null,
          action: 'lesson_completed',
          description: 'Completed Module 2',
          detail: 'Instrument Sterilization',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockApiClient.mockResolvedValue(items);

      const result = await quizService.getRecentActivity();

      expect(mockApiClient).toHaveBeenCalledWith('/admin/activity');
      expect(result).toEqual(items);
    });

    it('sends GET with limit query param', async () => {
      mockApiClient.mockResolvedValue([]);

      await quizService.getRecentActivity({ limit: 5 });

      expect(mockApiClient).toHaveBeenCalledWith('/admin/activity?limit=5');
    });

    it('sends GET with filter query param (excludes "all")', async () => {
      mockApiClient.mockResolvedValue([]);

      await quizService.getRecentActivity({ filter: 'quiz_passed' });

      expect(mockApiClient).toHaveBeenCalledWith('/admin/activity?filter=quiz_passed');
    });

    it('sends GET with both limit and filter', async () => {
      mockApiClient.mockResolvedValue([]);

      await quizService.getRecentActivity({ limit: 10, filter: 'lesson_completed' });

      expect(mockApiClient).toHaveBeenCalledWith('/admin/activity?limit=10&filter=lesson_completed');
    });

    it('does not include filter param when filter is "all"', async () => {
      mockApiClient.mockResolvedValue([]);

      await quizService.getRecentActivity({ limit: 5, filter: 'all' });

      expect(mockApiClient).toHaveBeenCalledWith('/admin/activity?limit=5');
    });
  });
});
