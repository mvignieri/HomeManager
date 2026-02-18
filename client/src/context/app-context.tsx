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
    let unsubscribed = false;

    // Set a timeout to exit loading state in case Firebase auth doesn't respond
    const timeoutId = setTimeout(() => {
      if (loading && !unsubscribed) {
        setLoading(false);
      }
    }, 2000);

    // Handle redirect result from Google sign-in with retry
    const handleRedirect = async () => {
      try {
        const { handleRedirectResult } = await import('@/lib/firebase');

        // Try multiple times with delay to ensure Firebase has time to process
        for (let i = 0; i < 3; i++) {
          const user = await handleRedirectResult();
          if (user) {
            console.warn('🟢 AppContext: Redirect result - user signed in:', user.email);
            return;
          }

          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait 300ms
          }
        }

        console.warn('🟡 AppContext: Redirect result - no user after retries');
      } catch (error) {
        console.error('🔴 AppContext: Error handling redirect:', error);
      }
    };

    handleRedirect();

    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (unsubscribed) return;
      // Clear the timeout since we received a response
      clearTimeout(timeoutId);

      if (authUser) {
        // User is signed in
        console.warn('🔵 AppContext: User signed in, checking database');
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

          console.warn('🟢 AppContext: User verified in database');

          // Check for pending invitation token
          // Only redirect if not already on the accept-invite page
          const pendingToken = localStorage.getItem('pendingInviteToken');
          const currentLocation = window.location.pathname;

          if (pendingToken && !currentLocation.startsWith('/accept-invite')) {
            console.warn('🔄 AppContext: Redirecting to accept-invite with token');
            setLocation(`/accept-invite?token=${pendingToken}`);
          }
        } catch (error) {
          console.error('🔴 AppContext: Error checking user:', error);
        }
      } else {
        // User is signed out
        console.warn('🟡 AppContext: User signed out');
        setUser(null);
        setCurrentHouse(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribed = true;
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
