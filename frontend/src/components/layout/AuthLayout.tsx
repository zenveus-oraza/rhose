import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth layout: plain color left panel with cmc-oral text, form on right.
 * No decorative circles. Left panel has rounded border, right does not.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-24px)] overflow-hidden bg-white">
      {/* Left plain color panel — rounded, just text */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-primary rounded-2xl border border-muted-200">
        <div className="relative z-10 text-center px-12">
          <h1 className="text-heading-page text-white mb-4">CMC-ORAL</h1>
          <p className="text-body text-white/90">
            Your learning journey starts here
          </p>
        </div>
      </div>

      {/* Right form panel — full height flex column to pin footer */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-between px-6 py-12 bg-white">
        <div />
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-helper text-muted-500">
          Having trouble?{' '}
          <a
            href="mailto:admin@cmc-oral.com"
            className="text-muted-500 underline"
          >
            Contact your admin
          </a>
        </p>
      </div>
    </div>
  );
}
