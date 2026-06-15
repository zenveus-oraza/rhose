export {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from './auth.schemas.js';

export {
  profileUpdateSchema,
  passwordChangeSchema,
  userCreationSchema,
  type ProfileUpdateInput,
  type PasswordChangeInput,
  type UserCreationInput,
} from './user.schemas.js';

export {
  createSegmentSchema,
  updateSegmentSchema,
  segmentStatusValues,
  type SegmentStatus,
  type CreateSegmentInput,
  type UpdateSegmentInput,
} from './segment.schemas.js';

export {
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
  type CreateModuleInput,
  type UpdateModuleInput,
  type ReorderModulesInput,
} from './module.schemas.js';

export {
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
  type CreateLessonInput,
  type UpdateLessonInput,
  type ReorderLessonsInput,
} from './lesson.schemas.js';

export {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  userListQuerySchema,
  userRoleValues,
  type UserRole,
  type AdminCreateUserInput,
  type AdminUpdateUserInput,
  type UserListQueryInput,
} from './user-management.schemas.js';

export {
  createQuizSchema,
  submitQuizAttemptSchema,
  quizOptionSchema,
  quizQuestionSchema,
  questionTypeValues,
  type QuestionType,
  type QuizOptionInput,
  type QuizQuestionInput,
  type CreateQuizInput,
  type SubmitQuizAttemptInput,
} from './quiz.schemas.js';
