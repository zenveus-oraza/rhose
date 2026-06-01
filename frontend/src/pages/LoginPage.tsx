import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Client-side validation
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
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
      await login(email, password);
      // Navigation is handled by the router/auth state
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className="text-heading-section text-navy mb-2">Welcome back</h1>
        <p className="text-body text-muted-600 mb-8">
          Sign in to your account to continue
        </p>

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
              htmlFor="login-email"
              className="block text-helper font-medium text-navy mb-1.5"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition ${
                fieldErrors.email
                  ? 'border-danger-400 focus:ring-danger-400'
                  : 'border-muted-300'
              }`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p id="login-email-error" className="mt-1 text-helper text-danger-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-helper font-medium text-navy mb-1.5"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={
                fieldErrors.password ? 'login-password-error' : undefined
              }
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition ${
                fieldErrors.password
                  ? 'border-danger-400 focus:ring-danger-400'
                  : 'border-muted-300'
              }`}
              placeholder="Enter your password"
            />
            {fieldErrors.password && (
              <p
                id="login-password-error"
                className="mt-1 text-helper text-danger-600"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-muted-300 text-teal accent-teal focus:ring-teal-400"
              />
              <span className="text-helper text-muted-600">Remember me</span>
            </label>

            <Link
              to="/forgot-password"
              className="text-helper font-medium text-teal-600 hover:text-teal-700 transition"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-navy px-4 py-2.5 text-body font-medium text-white hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
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
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Contact admin link */}
        <p className="mt-6 text-center text-helper text-muted-500">
          Don&apos;t have an account?{' '}
          <a
            href="mailto:admin@rhose.com"
            className="font-medium text-teal-600 hover:text-teal-700 transition"
          >
            Contact your admin
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
