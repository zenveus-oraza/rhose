import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';

/**
 * LessonLayout — A minimal layout wrapper for the lesson page.
 *
 * Unlike LearnerLayout, this has NO desktop sidebar (no Dashboard/My Learning/Profile/Logout links).
 * It only renders a mobile header with a hamburger icon that can be used to toggle
 * the mobile module drawer (handled by the LessonPage itself via context).
 * The page content (LessonPage) fills the full viewport width and renders its own left panel.
 */
export function LessonLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Main content area — full width, no sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — only visible on small screens */}
        <header className="flex h-14 items-center bg-white px-4 border-b border-muted-200 lg:hidden">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="rounded p-2 text-navy hover:bg-muted-100"
            aria-label="Open module navigation"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page content — fills full width */}
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ mobileDrawerOpen, setMobileDrawerOpen }} />
        </main>
      </div>
    </div>
  );
}
