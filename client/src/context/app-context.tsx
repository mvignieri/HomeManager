import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { auth, REQUIRED_AUTH_VERSION, AUTH_VERSION_KEY } from '@/lib/firebase';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Task, House, User as UserModel } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useGoogleCalendar, GoogleCalendarEvent } from '@/hooks/use-google-calendar';

// Make queryClient globally available for WebSocket
window.queryClient = queryClient;

interface GoogleCalendarContext {
  events: GoogleCalendarEvent[];
  isLoading: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  needsReconnect: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

interface AppContextProps {
  user: User | null;
  loading: boolean;
  currentHouse: House | null;
  setCurrentHouse: (house: House | null) => void;
  houses: House[];
  refreshHouses: () => void;
  showCreateHouseModal: boolean;
  setShowCreateHouseModal: (show: boolean) => void;
  googleCalendar: GoogleCalendarContext;
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
  googleCalendar: {
    events: [],
    isLoading: false,
    isConnected: false,
    isConnecting: false,
    needsReconnect: false,
    reconnect: () => {},
    disconnect: () => {},
  },
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentHouse, setCurrentHouse] = useState<House | null>(null);
  const [showCreateHouseModal, setShowCreateHouseModal] = useState(false);
  const [location, setLocation] = useLocation();

  // Firebase-based reauth: same popup mechanism used for the initial login,
  // which is the only thing that works reliably on iOS PWA.
  const firebaseReauthFn = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    if (user?.email) provider.setCustomParameters({ login_hint: user.email });
    try {
      const result = await reauthenticateWithPopup(auth.currentUser, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      return credential?.accessToken ?? null;
    } catch (err: any) {
      // User cancelled or popup was closed — not an error worth reporting
      if (
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/popup-closed-by-user'
      ) return null;
      console.error('🔴 AppContext: Calendar reauth failed:', err);
      return null;
    }
  }, [user?.email]);

  // Global Google Calendar connection — one instance for the whole app so
  // reconnect state is visible from any page (e.g. Navbar).
  const googleCalendar = useGoogleCalendar(user?.email ?? undefined, firebaseReauthFn);

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
        setLoading(false);
      }
    }, 2000);

    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      // Clear the timeout since we received a response
      clearTimeout(timeoutId);

      if (authUser) {
        // Force re-login if the session was created before the current auth
        // version (e.g. a new OAuth scope was added). The user will be sent
        // back to the login screen and will grant the new permissions on
        // their next sign-in.
        const storedVersion = localStorage.getItem(AUTH_VERSION_KEY);
        if (storedVersion !== REQUIRED_AUTH_VERSION) {
          console.warn('🔄 AppContext: Auth version mismatch – forcing re-login for new OAuth scopes');
          await auth.signOut();
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

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
    googleCalendar,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
