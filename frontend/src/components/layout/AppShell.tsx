import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — persistent, visible at lg (≥1024px) */}
      <div className="hidden w-60 shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger nav */}
        <header className="flex items-center border-b border-muted-200 bg-white px-4 py-3 lg:hidden">
          <MobileNav />
          <span className="ml-3 text-heading-card font-semibold text-navy">
            CMC Oral
          </span>
        </header>

        {/* Content grid */}
        <main className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-layout-mobile gap-4 p-4 lg:grid-cols-layout-desktop lg:gap-6 lg:p-6">
            <div className="col-span-4 lg:col-span-12">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
