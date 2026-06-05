import { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';

const learnerNavLinks = [
  { to: '/learner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/learner/learning', label: 'My Learning', icon: GraduationCap, end: false },
  { to: '/learner/profile', label: 'Profile', icon: UserCircle, end: false },
];

export function LearnerLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-24px)] overflow-hidden bg-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — has its own border and rounded corners */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#F8FAFC] rounded-2xl border border-muted-200
          transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header — logo centered */}
        <div className="flex items-center justify-center px-4 py-4 pb-6 relative">
          <img
            src="/images/cmc_oral_logo.png"
            alt="CMC Oral Logo"
            className="h-10 w-auto"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-3 rounded p-1 text-muted-500 hover:text-navy lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Divider — shorter on each side */}
        <div className="mx-4 border-b border-muted-200" />

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {learnerNavLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-body transition-colors ${
                  isActive
                    ? 'bg-secondary text-white font-medium'
                    : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
                }`
              }
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Divider — shorter on each side */}
        <div className="mx-4 border-b border-muted-200" />

        {/* Sidebar footer — logout only */}
        <div className="px-3 py-2">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body text-muted-600 hover:bg-muted-100 hover:text-navy transition-colors"
          >
            <img src="/icon/logout.png" alt="" className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area — no border, just content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navigation header */}
        <header className="flex h-14 items-center justify-between bg-white px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-2 text-navy hover:bg-muted-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          {/* Learner name and profile link */}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <Link
                to="/learner/profile"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-body text-muted-700 hover:bg-muted-100 hover:text-navy transition-colors"
              >
                <UserCircle size={20} className="text-muted-500" />
                <span className="font-medium">{user.name || 'Learner'}</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
