import { Home, BookOpen, Users, Settings, GraduationCap } from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { label: 'Dashboard', icon: Home, href: '#' },
  { label: 'Segments', icon: BookOpen, href: '#' },
  { label: 'Users', icon: Users, href: '#' },
  { label: 'Settings', icon: Settings, href: '#' },
];

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-navy text-white">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-6 py-5">
        <GraduationCap className="h-8 w-8 text-teal" />
        <span className="text-heading-card font-semibold tracking-tight">
          Rhose
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body text-muted-200 transition-colors hover:bg-navy-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer area */}
      <div className="border-t border-navy-600 px-6 py-4">
        <p className="text-helper text-muted-400">© 2024 Rhose</p>
      </div>
    </aside>
  );
}
