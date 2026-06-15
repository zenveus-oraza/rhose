import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file before validation
config();

const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

/**
 * Zod schema for environment variable validation.
 * The application will fail fast on startup if required variables are missing or invalid.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .url('DATABASE_URL must be a valid connection string'),

  // Server
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive('PORT must be a positive integer')),

  // Authentication / JWT
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(1, 'JWT_SECRET cannot be empty'),

  JWT_EXPIRES_IN: z
    .string()
    .default('7d'),

  // Email Service (Nodemailer SMTP)
  EMAIL_HOST: z
    .string({ required_error: 'EMAIL_HOST is required' })
    .min(1, 'EMAIL_HOST cannot be empty'),

  EMAIL_PORT: z
    .string()
    .default('587')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive('EMAIL_PORT must be a positive integer')),

  EMAIL_USER: z
    .string({ required_error: 'EMAIL_USER is required' })
    .min(1, 'EMAIL_USER cannot be empty'),

  EMAIL_PASS: z
    .string({ required_error: 'EMAIL_PASS is required' })
    .min(1, 'EMAIL_PASS cannot be empty'),

  EMAIL_FROM: z
    .string({ required_error: 'EMAIL_FROM is required' })
    .min(1, 'EMAIL_FROM cannot be empty'),

  // AWS / S3 Uploads
  AWS_REGION: z
    .string({ required_error: 'AWS_REGION is required' })
    .min(1, 'AWS_REGION cannot be empty'),

  AWS_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),

  AWS_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  S3_BUCKET_NAME: z
    .string({ required_error: 'S3_BUCKET_NAME is required' })
    .min(1, 'S3_BUCKET_NAME cannot be empty'),

  S3_PUBLIC_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url('S3_PUBLIC_BASE_URL must be a valid URL').optional()
  ),

  S3_KEY_PREFIX: z
    .string()
    .default('cmc-oral'),

  // Frontend / CORS
  FRONTEND_URL: z
    .string({ required_error: 'FRONTEND_URL is required' })
    .url('FRONTEND_URL must be a valid URL'),
}).superRefine((env, ctx) => {
  const hasAccessKey = Boolean(env.AWS_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(env.AWS_SECRET_ACCESS_KEY);

  if (hasAccessKey !== hasSecretKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AWS_ACCESS_KEY_ID'],
      message: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together, or both omitted for an EC2 IAM role',
    });
  }
});

/**
 * Validate environment variables against the schema.
 * Exits the process with a descriptive error if validation fails.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

/** Validated and typed environment variables */
export const env = validateEnv();

/** TypeScript type inferred from the env schema */
export type Env = z.infer<typeof envSchema>;
