import React from 'react';
import { useLocation } from 'wouter';
import { Home, Calendar, Laptop, BarChart3, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

export default function Sidebar() {
  const [location, setLocation] = useLocation();

  const navItems: NavItem[] = [
    { id: 'nav-dashboard', icon: Home, label: 'Home', path: '/' },
    { id: 'nav-calendar', icon: Calendar, label: 'Calendar', path: '/calendar' },
    { id: 'nav-tasks', icon: CheckCircle2, label: 'Tasks', path: '/tasks' },
    { id: 'nav-shopping', icon: ShoppingCart, label: 'Shopping', path: '/shopping-list' },
    { id: 'nav-smarthome', icon: Laptop, label: 'Devices', path: '/smart-home' },
    { id: 'nav-analytics', icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-20 hidden border-r border-white/60 bg-white/70 backdrop-blur-xl md:flex md:w-20 md:flex-col lg:w-64">
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.path;

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`h-11 w-full rounded-xl text-sm font-medium transition-all md:justify-center md:px-0 lg:justify-start lg:px-4 ${
                  active
                    ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className="h-5 w-5 lg:mr-3" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
