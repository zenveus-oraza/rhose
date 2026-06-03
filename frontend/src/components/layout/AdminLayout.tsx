import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Settings,
  Menu,
  X,
} from 'lucide-react';

export function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(
    location.pathname.startsWith('/admin/content') || location.pathname.startsWith('/admin/assign')
  );
  const [usersOpen, setUsersOpen] = useState(
    location.pathname.startsWith('/admin/users')
  );

  const isContentActive = location.pathname.startsWith('/admin/content') || location.pathname.startsWith('/admin/assign');
  const isUsersActive = location.pathname.startsWith('/admin/users');

  return (
    <div className="flex h-[calc(100vh-24px)] overflow-hidden bg-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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

        {/* Divider */}
        <div className="mx-4 border-b border-muted-200" />

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {/* Dashboard */}
          <NavLink
            to="/admin"
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-2 py-2 text-body transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          {/* Content Management — expandable */}
          <div>
            <button
              onClick={() => { setContentOpen(!contentOpen); navigate('/admin/content'); }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-body transition-colors ${
                isContentActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
              }`}
            >
              <img
                src="/icon/arrow_up.png"
                alt=""
                className={`h-5 w-5 transition-transform ${isContentActive ? 'invert brightness-0' : ''} ${contentOpen ? '' : 'rotate-180'}`}
              />
              <img src="/icon/content_mang.png" alt="" className={`h-5 w-5 ${isContentActive ? 'invert brightness-0' : ''}`} />
              <span>Content Management</span>
            </button>
            {contentOpen && (
              <div className="relative ml-[22px] mt-1 pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-muted-300" />
                <NavLink
                  to="/admin/content/segments/create"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-lg px-3 py-2 text-helper transition-colors before:absolute before:-left-4 before:top-1/2 before:h-px before:w-4 before:bg-muted-300 ${
                      isActive
                        ? 'bg-[#E2E8F0] text-navy font-medium'
                        : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
                    }`
                  }
                >
                  <img src="/icon/add.png" alt="" className="h-4 w-4" />
                  Create Segment
                </NavLink>
                <NavLink
                  to="/admin/assign-training"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-lg px-3 py-2 text-helper transition-colors before:absolute before:-left-4 before:top-1/2 before:h-px before:w-4 before:bg-muted-300 after:absolute after:-left-4 after:top-1/2 after:bottom-0 after:w-px after:bg-[#F8FAFC] ${
                      isActive
                        ? 'bg-[#E2E8F0] text-navy font-medium'
                        : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
                    }`
                  }
                >
                  <img src="/icon/assignment_add.png" alt="" className="h-4 w-4" />
                  Assign Segment
                </NavLink>
              </div>
            )}
          </div>

          {/* User Management — expandable */}
          <div>
            <button
              onClick={() => { setUsersOpen(!usersOpen); navigate('/admin/users'); }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-body transition-colors ${
                isUsersActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
              }`}
            >
              <img
                src="/icon/arrow_up.png"
                alt=""
                className={`h-5 w-5 transition-transform ${isUsersActive ? 'invert brightness-0' : ''} ${usersOpen ? '' : 'rotate-180'}`}
              />
              <img src="/icon/group_add.png" alt="" className={`h-5 w-5 ${isUsersActive ? 'invert brightness-0' : ''}`} />
              <span>User Management</span>
            </button>
            {usersOpen && (
              <div className="relative ml-[22px] mt-1 pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-muted-300" />
                <NavLink
                  to="/admin/users/create"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-lg px-3 py-2 text-helper transition-colors before:absolute before:-left-4 before:top-1/2 before:h-px before:w-4 before:bg-muted-300 after:absolute after:-left-4 after:top-1/2 after:bottom-0 after:w-px after:bg-[#F8FAFC] ${
                      isActive
                        ? 'bg-[#E2E8F0] text-navy font-medium'
                        : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
                    }`
                  }
                >
                  <img src="/icon/group_add.png" alt="" className="h-4 w-4" />
                  Create User
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* Divider */}
        <div className="mx-4 border-b border-muted-200" />

        {/* Sidebar footer */}
        <div className="px-2 py-2 space-y-1">
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-2 py-2 text-body transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
              }`
            }
          >
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-body text-muted-600 hover:bg-muted-100 hover:text-navy transition-colors"
          >
            <img src="/icon/logout.png" alt="" className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-2 text-navy hover:bg-muted-100"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
