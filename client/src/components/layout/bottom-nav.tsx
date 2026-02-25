import React from 'react';
import { useLocation } from 'wouter';
import { Home, Calendar, Laptop, BarChart3, CheckCircle2, ShoppingCart } from 'lucide-react';
import { useSectionPermissions, SectionAccess } from '@/hooks/use-section-permissions';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  accessKey?: keyof SectionAccess;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'nav-dashboard', icon: Home,        label: 'Home',    path: '/' },
  { id: 'nav-tasks',     icon: CheckCircle2, label: 'Tasks',   path: '/tasks',         accessKey: 'canViewTasks' },
  { id: 'nav-calendar',  icon: Calendar,     label: 'Calendar',path: '/calendar',      accessKey: 'canViewCalendar' },
  { id: 'nav-shopping',  icon: ShoppingCart, label: 'Shop',    path: '/shopping-list', accessKey: 'canViewShopping' },
  { id: 'nav-smarthome', icon: Laptop,       label: 'Devices', path: '/smart-home',    accessKey: 'canViewDevices' },
  { id: 'nav-analytics', icon: BarChart3,    label: 'Stats',   path: '/analytics',     accessKey: 'canViewAnalytics' },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const sectionAccess = useSectionPermissions();

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => !item.accessKey || sectionAccess[item.accessKey],
  );

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-white/70 bg-white/85 p-1.5 shadow-[0_14px_35px_rgba(15,23,42,0.18)] backdrop-blur-xl md:hidden">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.path;

          return (
            <button
              key={item.id}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium transition-all ${
                active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
