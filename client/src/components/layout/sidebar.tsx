import React from 'react';
import { useLocation } from 'wouter';
import { Home, Calendar, Laptop, BarChart3, CheckCircle2 } from 'lucide-react';
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
    { id: 'nav-smarthome', icon: Laptop, label: 'Devices', path: '/smart-home' },
    { id: 'nav-analytics', icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 z-20">
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Button
                key={item.id}
                variant={active ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
