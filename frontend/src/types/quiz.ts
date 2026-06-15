// Quiz entity types matching backend response shapes

// --- Quiz Option ---

export interface QuizOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}

/** Learner-facing option (no is_correct field) */
export interface LearnerQuizOption {
  id: string;
  optionText: string;
  sortOrder: number;
}

// --- Quiz Question ---

export type QuestionType = 'single_select' | 'multi_select';

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  sortOrder: number;
  options: QuizOption[];
}

export interface LearnerQuizQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  sortOrder: number;
  options: LearnerQuizOption[];
}

// --- Quiz ---

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  segmentId: string;
  isRequired: boolean;
  maxAttempts: number | null;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface LearnerQuiz {
  id: string;
  title: string;
  description: string | null;
  segmentId: string;
  isRequired: boolean;
  maxAttempts: number | null;
  questions: LearnerQuizQuestion[];
}

// --- Quiz Input (Create/Update) ---

export interface QuizOptionInput {
  option_text: string;
  is_correct: boolean;
}

export interface QuizQuestionInput {
  question_text: string;
  question_type: QuestionType;
  options: QuizOptionInput[];
}

export interface CreateQuizInput {
  title?: string;
  description?: string;
  is_required?: boolean;
  max_attempts?: number | null;
  questions: QuizQuestionInput[];
}

// --- Quiz Attempt ---

export interface AnswerInput {
  question_id: string;
  selected_option_ids: string[];
}

export interface SubmitQuizAttemptInput {
  answers: AnswerInput[];
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
}

export interface AttemptSummary {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
}

export interface OptionDetail {
  id: string;
  optionText: string;
}

export interface AttemptAnswerDetail {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  selectedOptions: OptionDetail[];
  correctOptions: OptionDetail[];
  isCorrect: boolean;
}

export interface AttemptDetail {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  answers: AttemptAnswerDetail[];
}

// --- Activity ---

export type ActivityAction =
  | 'quiz_passed'
  | 'quiz_failed'
  | 'lesson_completed'
  | 'lesson_resumed'
  | 'segment_assigned'
  | 'user_created'
  | 'module_completed';

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  action: ActivityAction;
  description: string;
  detail?: string;
  score?: string;
  createdAt: string;
}
