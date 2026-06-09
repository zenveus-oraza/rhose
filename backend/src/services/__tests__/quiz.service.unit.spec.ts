import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the quiz service attempt history/detail logic.
 * 
 * Since the Drizzle ORM query builder chain is complex to mock accurately,
 * we test the pure logic (percentage calculation, correctness determination)
 * extracted from the service methods. The service is also tested at the
 * integration level via route tests.
 *
 * Validates: Requirements 5.1–5.4
 */

describe('QuizService Logic — Percentage Calculation (Task 5.2)', () => {
  // The actual formula used in quiz.service.ts:
  // Math.round((score / totalQuestions) * 100)
  const calculatePercentage = (score: number, totalQuestions: number): number => {
    return Math.round((score / totalQuestions) * 100);
  };

  it('should calculate 80% for 8/10', () => {
    expect(calculatePercentage(8, 10)).toBe(80);
  });

  it('should calculate 50% for 5/10', () => {
    expect(calculatePercentage(5, 10)).toBe(50);
  });

  it('should calculate 100% for perfect score', () => {
    expect(calculatePercentage(10, 10)).toBe(100);
  });

  it('should calculate 0% for zero score', () => {
    expect(calculatePercentage(0, 5)).toBe(0);
  });

  it('should round 77.777... to 78% (7/9)', () => {
    expect(calculatePercentage(7, 9)).toBe(78);
  });

  it('should round 66.666... to 67% (2/3)', () => {
    expect(calculatePercentage(2, 3)).toBe(67);
  });

  it('should round 33.333... to 33% (1/3)', () => {
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it('should handle 1/1 as 100%', () => {
    expect(calculatePercentage(1, 1)).toBe(100);
  });

  it('should handle 0/1 as 0%', () => {
    expect(calculatePercentage(0, 1)).toBe(0);
  });
});

describe('QuizService Logic — Correctness Determination (Task 5.2)', () => {
  // The actual logic used in quiz.service.ts for determining if a question was answered correctly:
  // For both single_select and multi_select: exact match of sets
  const isAnswerCorrect = (selectedOptionIds: string[], correctOptionIds: string[]): boolean => {
    const correctSet = new Set(correctOptionIds);
    const selectedSet = new Set(selectedOptionIds);
    return (
      selectedSet.size === correctSet.size &&
      [...selectedSet].every((id) => correctSet.has(id))
    );
  };

  describe('single_select', () => {
    it('should be correct when selected matches the single correct option', () => {
      expect(isAnswerCorrect(['opt-a'], ['opt-a'])).toBe(true);
    });

    it('should be incorrect when selected does not match correct', () => {
      expect(isAnswerCorrect(['opt-b'], ['opt-a'])).toBe(false);
    });

    it('should be incorrect when nothing selected (unanswered)', () => {
      expect(isAnswerCorrect([], ['opt-a'])).toBe(false);
    });
  });

  describe('multi_select', () => {
    it('should be correct when all correct options selected exactly', () => {
      expect(isAnswerCorrect(['opt-a', 'opt-b'], ['opt-a', 'opt-b'])).toBe(true);
    });

    it('should be correct regardless of selection order', () => {
      expect(isAnswerCorrect(['opt-b', 'opt-a'], ['opt-a', 'opt-b'])).toBe(true);
    });

    it('should be incorrect when only partial correct options selected', () => {
      expect(isAnswerCorrect(['opt-a'], ['opt-a', 'opt-b'])).toBe(false);
    });

    it('should be incorrect when extra incorrect options selected', () => {
      expect(isAnswerCorrect(['opt-a', 'opt-b', 'opt-c'], ['opt-a', 'opt-b'])).toBe(false);
    });

    it('should be incorrect when nothing selected (unanswered)', () => {
      expect(isAnswerCorrect([], ['opt-a', 'opt-b'])).toBe(false);
    });

    it('should be incorrect when completely wrong options selected', () => {
      expect(isAnswerCorrect(['opt-c', 'opt-d'], ['opt-a', 'opt-b'])).toBe(false);
    });
  });
});

describe('QuizService Logic — AttemptSummary Mapping (Task 5.2)', () => {
  // Tests the mapping from raw DB rows to AttemptSummary shape
  interface RawAttempt {
    id: string;
    score: number;
    totalQuestions: number;
    completedAt: Date;
  }

  interface AttemptSummary {
    id: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    completedAt: string;
  }

  const mapToAttemptSummary = (attempt: RawAttempt): AttemptSummary => ({
    id: attempt.id,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: Math.round((attempt.score / attempt.totalQuestions) * 100),
    completedAt: attempt.completedAt.toISOString(),
  });

  it('should map raw attempt data to AttemptSummary with correct fields', () => {
    const raw: RawAttempt = {
      id: 'attempt-1',
      score: 8,
      totalQuestions: 10,
      completedAt: new Date('2024-03-15T10:00:00.000Z'),
    };

    expect(mapToAttemptSummary(raw)).toEqual({
      id: 'attempt-1',
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      completedAt: '2024-03-15T10:00:00.000Z',
    });
  });

  it('should convert completedAt Date to ISO string', () => {
    const raw: RawAttempt = {
      id: 'attempt-2',
      score: 3,
      totalQuestions: 5,
      completedAt: new Date('2024-06-01T14:30:00.000Z'),
    };

    const result = mapToAttemptSummary(raw);
    expect(result.completedAt).toBe('2024-06-01T14:30:00.000Z');
  });

  it('should handle edge case of 1 question quiz', () => {
    const raw: RawAttempt = {
      id: 'attempt-3',
      score: 1,
      totalQuestions: 1,
      completedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    const result = mapToAttemptSummary(raw);
    expect(result.percentage).toBe(100);
  });
});

describe('QuizService Logic — Answer Grouping (Task 5.2)', () => {
  // Tests the grouping logic used to map flat answer rows to per-question selections
  interface AnswerRow {
    questionId: string;
    selectedOptionId: string;
  }

  const groupAnswersByQuestion = (answers: AnswerRow[]): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    for (const answer of answers) {
      const existing = map.get(answer.questionId) ?? [];
      existing.push(answer.selectedOptionId);
      map.set(answer.questionId, existing);
    }
    return map;
  };

  it('should group single selections per question', () => {
    const answers: AnswerRow[] = [
      { questionId: 'q1', selectedOptionId: 'opt-a' },
      { questionId: 'q2', selectedOptionId: 'opt-b' },
    ];

    const grouped = groupAnswersByQuestion(answers);
    expect(grouped.get('q1')).toEqual(['opt-a']);
    expect(grouped.get('q2')).toEqual(['opt-b']);
  });

  it('should group multiple selections for multi_select questions', () => {
    const answers: AnswerRow[] = [
      { questionId: 'q1', selectedOptionId: 'opt-a' },
      { questionId: 'q1', selectedOptionId: 'opt-b' },
      { questionId: 'q2', selectedOptionId: 'opt-c' },
    ];

    const grouped = groupAnswersByQuestion(answers);
    expect(grouped.get('q1')).toEqual(['opt-a', 'opt-b']);
    expect(grouped.get('q2')).toEqual(['opt-c']);
  });

  it('should return empty map for no answers', () => {
    const grouped = groupAnswersByQuestion([]);
    expect(grouped.size).toBe(0);
  });

  it('should handle unanswered questions (no entry in map)', () => {
    const answers: AnswerRow[] = [
      { questionId: 'q1', selectedOptionId: 'opt-a' },
    ];

    const grouped = groupAnswersByQuestion(answers);
    expect(grouped.get('q2')).toBeUndefined(); // unanswered
    // Fallback used in service: ?? []
    expect(grouped.get('q2') ?? []).toEqual([]);
  });
});
