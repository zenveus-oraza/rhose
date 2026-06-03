import { Home, BookOpen, Users, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  onClose?: () => void;
}

const adminNavItems = [
  { label: 'Dashboard', icon: Home, href: '#' },
  { label: 'Segments', icon: BookOpen, href: '#' },
  { label: 'Users', icon: Users, href: '#' },
];

const learnerNavItems = [
  { label: 'Dashboard', icon: Home, href: '#' },
  { label: 'My Learning', icon: BookOpen, href: '#' },
];

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : learnerNavItems;

  return (
    <aside className="flex h-full w-full flex-col bg-[#F8FAFC] text-navy p-global-padding">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src="/images/cmc_oral_logo.png"
          alt="CMC Oral Logo"
          className="h-8 w-8"
        />
        <span className="text-heading-card font-semibold tracking-tight text-navy">
          CMC Oral
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1" aria-label="Main navigation">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body text-muted-600 transition-colors hover:bg-white/40 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer area */}
      <div className="border-t border-muted-200 pt-4 space-y-3">
        {isAdmin && (
          <a
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body text-muted-600 transition-colors hover:bg-white/40 hover:text-navy"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </a>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body text-muted-600 transition-colors hover:bg-white/40 hover:text-navy"
        >
          <img src="/icon/logout.png" alt="" className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
