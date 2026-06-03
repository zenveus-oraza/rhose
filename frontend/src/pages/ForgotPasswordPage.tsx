import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { forgotPassword } from '@/services/auth.service';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  function validate(): boolean {
    if (!email.trim()) {
      setFieldError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('Please enter a valid email address');
      return false;
    }
    setFieldError('');
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      // Even on error, show success message to avoid email enumeration
      // Only show error for network/unexpected failures
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      if (message.includes('network') || message.includes('fetch')) {
        setError(message);
      } else {
        // For security, always show success regardless of whether email exists
        setIsSubmitted(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <AuthLayout heading="Check your email" subtext="If an account exists with that email address, a password reset link has been sent.">
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
            className="inline-block rounded-md bg-primary px-6 py-2.5 text-body font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition"
          >
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Forgot password?"
      subtext="Enter your email and we'll send you a link to reset your password."
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

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email field */}
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-helper font-medium text-navy mb-1.5"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError('');
              }}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'forgot-email-error' : undefined}
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                fieldError
                  ? 'border-danger-400 focus:ring-danger-400'
                  : 'border-muted-300'
              }`}
              placeholder="you@example.com"
            />
            {fieldError && (
              <p id="forgot-email-error" className="mt-1 text-helper text-danger-600">
                {fieldError}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-body font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
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
                Sending...
              </span>
            ) : (
              'Send reset email'
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
