import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

function LoginLeftExtra() {
  return (
    <div>
      <h2 className="text-[32px] font-bold text-white leading-tight mb-3">
        Staff training, kept simple.
      </h2>
      <p className="text-body text-white/90 mb-6">
        Track progress, meet deadlines, and stay compliant with clear step-by-step learning.
      </p>
      {/* Avatar stack */}
      <div className="flex -space-x-3">
        <img src="/users/Images.png" alt="" className="h-10 w-10 rounded-full border-2 border-primary" />
        <img src="/users/Images-1.png" alt="" className="h-10 w-10 rounded-full border-2 border-primary" />
        <img src="/users/Images-2.png" alt="" className="h-10 w-10 rounded-full border-2 border-primary" />
        <img src="/users/Images-3.png" alt="" className="h-10 w-10 rounded-full border-2 border-primary" />
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      toast('error', message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Welcome back"
      subtext="Sign in to your account to continue"
      leftExtra={<LoginLeftExtra />}
    >
      <div>
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
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
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
              className={`w-full rounded-md border px-3 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
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

          {/* Remember me */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-muted-300 text-primary accent-primary focus:ring-primary"
              />
              <span className="text-helper text-muted-600">Remember me</span>
            </label>
          </div>

          {/* Login button */}
          <Button type="submit" fullWidth isLoading={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Forgot password — centered below button */}
        <p className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-helper font-medium text-primary hover:text-muted-700 transition"
          >
            Forgot password?
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
