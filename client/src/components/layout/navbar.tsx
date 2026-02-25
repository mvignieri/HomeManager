import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/context/app-context';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from '@/components/notifications/notification-bell';
import { useLocation } from 'wouter';
import { signOut } from '@/lib/firebase';
import { Home, Mail, Sparkles, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title = 'HomeManager' }: NavbarProps) {
  const { user, currentHouse, houses, setCurrentHouse, setShowCreateHouseModal, googleCalendar } = useAppContext();
  const { needsReconnect, isConnecting, reconnect } = googleCalendar;
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  const { data: dbUser } = useQuery({
    queryKey: ['/api/users/me', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      return users.find((u: any) => u.uid === user.uid);
    },
    enabled: !!user,
  });

  const { data: pendingInvitationsCount = 0 } = useQuery({
    queryKey: ['/api/invitations/count', dbUser?.email],
    queryFn: async () => {
      if (!dbUser || !houses || houses.length === 0) return 0;

      const allInvites = await Promise.all(
        houses.map(async (house) => {
          try {
            const res = await fetch(`/api/houses/${house.id}/invitations`);
            if (!res.ok) return [];
            return res.json();
          } catch {
            return [];
          }
        })
      );

      const flat = allInvites.flat();
      const pending = flat.filter((inv: any) => inv.email === dbUser.email && inv.status === 'pending');
      return pending.length;
    },
    enabled: !!dbUser && !!houses && houses.length > 0,
  });

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-3 md:h-16 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="hidden h-9 w-9 rounded-xl border border-slate-200 bg-white/80 md:flex"
          >
            <Home className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-800 md:text-xl">{title}</h1>
            <p className="hidden items-center gap-1 text-[11px] text-slate-500 md:flex">
              <Sparkles className="h-3 w-3" />
              Esperienza smart condivisa
            </p>
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 hidden items-center rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-600 md:flex">
                {currentHouse?.name || 'Select House'}
                <span className="material-icons ml-1 text-base text-slate-400">expand_more</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Houses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {houses.map((house) => (
                  <DropdownMenuItem
                    key={house.id}
                    className={house.id === currentHouse?.id ? 'bg-gray-100' : ''}
                    onClick={() => setCurrentHouse(house)}
                  >
                    {house.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCreateHouseModal(true)}>
                  <span className="material-icons mr-2 text-sm text-gray-400">add</span>
                  Create New House
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {user && (
          <div className="ml-2 flex shrink-0 items-center gap-1 md:gap-2">
            {/* Google Calendar reconnect — shown globally when token is lost */}
            {needsReconnect && (
              <Button
                variant="ghost"
                size="icon"
                onClick={reconnect}
                title="Reconnect Google Calendar"
                className="relative h-9 w-9 rounded-xl border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 md:h-10 md:w-10"
              >
                <CalendarX className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            {isConnecting && (
              <Button
                variant="ghost"
                size="icon"
                disabled
                className="h-9 w-9 rounded-xl border border-slate-200 bg-white/80 md:h-10 md:w-10"
              >
                <CalendarX className="h-4 w-4 animate-pulse text-slate-400 md:h-5 md:w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/invitations')}
              className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white/80 md:h-10 md:w-10"
            >
              <Mail className="h-4 w-4 md:h-5 md:w-5" />
              {pendingInvitationsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px] md:h-5 md:w-5 md:text-xs"
                >
                  {pendingInvitationsCount}
                </Badge>
              )}
            </Button>

            <NotificationBell userId={dbUser?.id} houseId={currentHouse?.id} />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`}
                  alt="User profile"
                  className="h-8 w-8 rounded-full border border-slate-200 md:h-9 md:w-9"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="hidden md:block">{user.displayName}</DropdownMenuLabel>
                <DropdownMenuLabel className="hidden text-xs font-normal text-gray-500 md:block">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="hidden md:block" />
                <DropdownMenuItem onClick={() => setLocation('/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
