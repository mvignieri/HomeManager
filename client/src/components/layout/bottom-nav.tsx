import React from 'react';
import { useLocation } from 'wouter';
import { Home, Calendar, Laptop, BarChart3, CheckCircle2, ShoppingCart } from 'lucide-react';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const navItems: NavItem[] = [
    { id: 'nav-dashboard', icon: Home, label: 'Home', path: '/' },
    { id: 'nav-calendar', icon: Calendar, label: 'Calendar', path: '/calendar' },
    { id: 'nav-tasks', icon: CheckCircle2, label: 'Tasks', path: '/tasks' },
    { id: 'nav-shopping', icon: ShoppingCart, label: 'Shop', path: '/shopping-list' },
    { id: 'nav-smarthome', icon: Laptop, label: 'Devices', path: '/smart-home' },
    { id: 'nav-analytics', icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-white/70 bg-white/85 p-1.5 shadow-[0_14px_35px_rgba(15,23,42,0.18)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-6 gap-1">
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
