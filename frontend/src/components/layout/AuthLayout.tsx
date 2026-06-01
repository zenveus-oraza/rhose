import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Shared auth layout with desktop split (teal visual panel + form)
 * and mobile single-column (form only).
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left teal visual panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-teal-600 to-teal-400 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative z-10 text-center px-12">
          <h1 className="text-heading-page text-white mb-4">Rhose</h1>
          <p className="text-body text-white/90">
            Your learning journey starts here
          </p>
        </div>
      </div>

      {/* Right form panel — full width on mobile */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
