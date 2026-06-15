import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { resetPassword } from '@/services/auth.service';

type PasswordStrength = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

const strengthConfig: Record<
  PasswordStrength,
  { label: string; color: string; bgColor: string; width: string }
> = {
  weak: {
    label: 'Weak',
    color: 'text-danger-600',
    bgColor: 'bg-danger-400',
    width: 'w-1/3',
  },
  medium: {
    label: 'Medium',
    color: 'text-warning-600',
    bgColor: 'bg-warning-500',
    width: 'w-2/3',
  },
  strong: {
    label: 'Strong',
    color: 'text-success-600',
    bgColor: 'bg-success-500',
    width: 'w-full',
  },
};

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
    token?: string;
  }>({});

  const strength = getPasswordStrength(newPassword);
  const strengthInfo = strengthConfig[strength];

  function validate(): boolean {
    const errors: {
      newPassword?: string;
      confirmPassword?: string;
      token?: string;
    } = {};

    if (!token) {
      errors.token = 'Invalid or missing reset token. Please request a new reset link.';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setIsSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout heading="Password reset successful" subtext="Your password has been updated. You can now sign in with your new password.">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
            <svg
              className="h-6 w-6 text-success-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <Link
            to="/login"
            className="inline-block rounded-md bg-secondary px-6 py-2.5 text-body font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition"
          >
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Reset your password"
      subtext="Enter your new password below."
    >
      <div>
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-helper text-danger-700"
          >
            {error}
          </div>
        )}

        {fieldErrors.token && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-helper text-danger-700"
          >
            {fieldErrors.token}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* New password field */}
          <div>
            <label
              htmlFor="reset-new-password"
              className="block text-helper font-medium text-navy mb-1.5"
            >
              New password
            </label>
            <PasswordInput
              id="reset-new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              aria-invalid={!!fieldErrors.newPassword}
              aria-describedby={
                fieldErrors.newPassword
                  ? 'reset-new-password-error'
                  : 'password-strength'
              }
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                fieldErrors.newPassword
                  ? 'border-danger-400 focus:ring-danger-400'
                  : 'border-muted-300'
              }`}
              placeholder="Enter new password"
            />
            {fieldErrors.newPassword && (
              <p
                id="reset-new-password-error"
                className="mt-1 text-helper text-danger-600"
              >
                {fieldErrors.newPassword}
              </p>
            )}

            {/* Password strength indicator */}
            {newPassword && (
              <div id="password-strength" className="mt-2" aria-live="polite">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-helper text-muted-500">
                    Password strength
                  </span>
                  <span className={`text-helper font-medium ${strengthInfo.color}`}>
                    {strengthInfo.label}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted-200">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${strengthInfo.bgColor} ${strengthInfo.width}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm password field */}
          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-helper font-medium text-navy mb-1.5"
            >
              Confirm password
            </label>
            <PasswordInput
              id="reset-confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
              }}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? 'reset-confirm-password-error'
                  : undefined
              }
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                fieldErrors.confirmPassword
                  ? 'border-danger-400 focus:ring-danger-400'
                  : 'border-muted-300'
              }`}
              placeholder="Confirm new password"
            />
            {fieldErrors.confirmPassword && (
              <p
                id="reset-confirm-password-error"
                className="mt-1 text-helper text-danger-600"
              >
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full rounded-md bg-secondary px-4 py-2.5 text-body font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Resetting...
              </span>
            ) : (
              'Reset password'
            )}
          </button>
        </form>

        {/* Back to login */}
        <p className="mt-6 text-center">
          <Link
            to="/login"
            className="text-helper font-medium text-primary hover:text-primary/80 transition"
          >
            ← Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
