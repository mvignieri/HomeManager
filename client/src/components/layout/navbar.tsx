import React from 'react';
import { User } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/context/app-context';
import { House } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from '@/components/notifications/notification-bell';
import { useLocation } from 'wouter';
import { signOut } from '@/lib/firebase';
import { Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title = "HomeTask" }: NavbarProps) {
  const { user, currentHouse, houses, setCurrentHouse, setShowCreateHouseModal } = useAppContext();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await signOut();
    setLocation('/');
  };

  // Get database user ID from Firebase UID
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

  // Get pending invitations count
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-4">
        <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="h-8 w-8 shrink-0 hidden md:flex"
          >
            <Home className="h-5 w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-bold text-primary truncate">{title}</h1>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex bg-gray-100 rounded-md px-3 py-1 text-sm font-medium text-gray-600 items-center">
                {currentHouse?.name || "Select House"}
                <span className="material-icons text-gray-400 text-base align-text-bottom ml-1">expand_more</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Houses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {houses.map((house) => (
                  <DropdownMenuItem
                    key={house.id}
                    className={house.id === currentHouse?.id ? "bg-gray-100" : ""}
                    onClick={() => setCurrentHouse(house)}
                  >
                    {house.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCreateHouseModal(true)}>
                  <span className="material-icons text-gray-400 text-sm mr-2">add</span>
                  Create New House
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {user && (
          <div className="flex items-center space-x-1 md:space-x-2 shrink-0">
            {/* Invitations Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/invitations')}
              className="relative h-9 w-9 md:h-10 md:w-10"
            >
              <Mail className="h-4 w-4 md:h-5 md:w-5" />
              {pendingInvitationsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 flex items-center justify-center p-0 text-[10px] md:text-xs"
                >
                  {pendingInvitationsCount}
                </Badge>
              )}
            </Button>

            <NotificationBell
              userId={dbUser?.id}
              houseId={currentHouse?.id}
            />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center">
                <img
                  src={user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || "User")}
                  alt="User profile"
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="hidden md:block">{user.displayName}</DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs text-gray-500 font-normal hidden md:block">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="hidden md:block" />
                <DropdownMenuItem onClick={() => setLocation('/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings')}>
                  Settings
                </DropdownMenuItem>
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
