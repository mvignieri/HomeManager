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
import { useAuth } from '@/hooks/use-auth';
import { useAppContext } from '@/context/app-context';
import { House } from '@shared/schema';

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title = "HomeTask" }: NavbarProps) {
  const { user, logout } = useAuth();
  const { currentHouse, houses, setCurrentHouse } = useAppContext();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary">{title}</h1>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-gray-100 rounded-md px-3 py-1 text-sm font-medium text-gray-600 flex items-center">
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
                <DropdownMenuItem>
                  <span className="material-icons text-gray-400 text-sm mr-2">add</span>
                  Create New House
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <span className="material-icons text-gray-600">notifications</span>
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center">
                <img 
                  src={user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || "User")} 
                  alt="User profile" 
                  className="w-8 h-8 rounded-full"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
