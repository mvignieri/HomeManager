import React from 'react';
import { useLocation } from 'wouter';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  
  const navItems: NavItem[] = [
    { id: 'nav-dashboard', icon: 'dashboard', label: 'Home', path: '/' },
    { id: 'nav-calendar', icon: 'calendar_today', label: 'Calendar', path: '/calendar' },
    { id: 'nav-smarthome', icon: 'home', label: 'Smart Home', path: '/smart-home' },
    { id: 'nav-analytics', icon: 'bar_chart', label: 'Analytics', path: '/analytics' },
    { id: 'nav-tasks', icon: 'list_alt', label: 'Tasks', path: '/tasks' },
  ];

  const handleNavClick = (path: string) => {
    setLocation(path);
  };

  return (
    <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-30">
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`flex flex-col items-center justify-center py-3 px-2 ${
                location === item.path ? 'text-primary' : 'text-gray-500'
              }`}
              onClick={() => handleNavClick(item.path)}
            >
              <span className="material-icons text-current">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
