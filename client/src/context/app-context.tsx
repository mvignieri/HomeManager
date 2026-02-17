import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Task, House, User as UserModel } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

// Make queryClient globally available for WebSocket
window.queryClient = queryClient;

interface AppContextProps {
  user: User | null;
  loading: boolean;
  currentHouse: House | null;
  setCurrentHouse: (house: House | null) => void;
  houses: House[];
  refreshHouses: () => void;
  showCreateHouseModal: boolean;
  setShowCreateHouseModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextProps>({
  user: null,
  loading: true,
  currentHouse: null,
  setCurrentHouse: () => {},
  houses: [],
  refreshHouses: () => {},
  showCreateHouseModal: false,
  setShowCreateHouseModal: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [showCreateHouseModal, setShowCreateHouseModal] = useState(false);
  const [location, setLocation] = useLocation();

  // Fetch houses for the current user
  const { data: houses = [], refetch: refreshHouses } = useQuery<House[]>({
    queryKey: ['/api/houses', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const res = await fetch(`/api/houses?uid=${user.uid}`);
      if (!res.ok) throw new Error('Failed to fetch houses');
      return res.json();
    },
    enabled: !!user,
  });

  // Set the first house as current if none is selected and houses are available
  useEffect(() => {
    if (houses.length > 0 && !currentHouse) {
      setCurrentHouse(houses[0]);
    }
  }, [houses, currentHouse]);

  // Listen for auth state changes
  useEffect(() => {
    // Set a timeout to exit loading state in case Firebase auth doesn't respond
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Firebase auth timeout reached, showing login screen');
        setLoading(false);
      }
    }, 2000);

    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      // Clear the timeout since we received a response
      clearTimeout(timeoutId);

      console.log('Auth state changed:', authUser ? authUser.email : 'no user');

      if (authUser) {
        // User is signed in
        setUser(authUser);

        // Check if the user exists in our database, if not create them
        try {
          const response = await fetch('/api/user/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to verify user');
          }

          console.log('User verified/created in database');

          // Check for pending invitation token
          // Only redirect if not already on the accept-invite page
          const pendingToken = localStorage.getItem('pendingInviteToken');
          const currentLocation = window.location.pathname;
          if (pendingToken && !currentLocation.startsWith('/accept-invite')) {
            console.log('Found pending invitation token, redirecting to accept page');
            // Redirect to accept-invite page with the token
            setTimeout(() => {
              setLocation(`/accept-invite?token=${pendingToken}`);
            }, 500);
          }
        } catch (error) {
          console.error('Error checking user:', error);
        }
      } else {
        // User is signed out
        setUser(null);
        setCurrentHouse(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [loading, setLocation]);

  const value = {
    user,
    loading,
    currentHouse,
    setCurrentHouse,
    houses,
    refreshHouses,
    showCreateHouseModal,
    setShowCreateHouseModal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
