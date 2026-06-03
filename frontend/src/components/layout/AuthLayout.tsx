import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  /** Heading shown top-left of the left panel (e.g. "Welcome back") */
  heading: string;
  /** Subtext below the heading */
  subtext: string;
  /** Optional extra content in the left panel below heading (e.g. marketing text + avatars) */
  leftExtra?: ReactNode;
}

/**
 * Auth layout:
 * - Left panel: primary bg, heading+subtext top-left (96px bold, primary text on white? No — white text on primary bg)
 *   Wait — you said "primary text color for these" but the bg is primary (#75D8D5).
 *   White text on primary bg makes sense visually.
 * - Right panel: form content + "Having trouble?" at bottom.
 */
export function AuthLayout({ children, heading, subtext, leftExtra }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-24px)] overflow-hidden bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-primary rounded-2xl border border-muted-200 py-10 px-8">
        {/* Top-left: heading + subtext */}
        <div>
          <h1 className="text-[72px] font-bold leading-none opacity-90 mb-4">
            {heading}
          </h1>
          <p className="text-body">
            {subtext}
          </p>
        </div>

        {/* Optional extra content (vertically centered or below) */}
        {leftExtra && (
          <div className='mt-32'>{leftExtra}</div>
        )}
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 flex-col px-6 py-12 bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-helper text-muted-500">
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
