import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, handleRedirectResult } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check current auth state immediately
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.warn('🔵 Auth: Current user found on mount:', currentUser.email);
      setUser(currentUser);
      setLoading(false);
    } else {
      console.warn('🔵 Auth: No current user on mount');
    }

    // Safety timeout: if auth doesn't respond in 2 seconds, stop loading
    const timeout = setTimeout(() => {
      console.warn('⏰ Auth: Timeout reached - stopping loading');
      setLoading(false);
    }, 2000);

    // Handle redirect result (if user is returning from Google sign-in)
    handleRedirectResult()
      .then((user) => {
        if (user) {
          console.warn('🟢 Auth: Redirect result - user signed in:', user.email);
        } else {
          console.warn('🟡 Auth: Redirect result - no user');
        }
      })
      .catch((error) => {
        console.error('🔴 Auth: Error handling redirect:', error);
      });

    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      clearTimeout(timeout); // Clear timeout if auth responds
      if (authUser) {
        console.warn('🟢 Auth: State changed - user signed in:', authUser.email);
      } else {
        console.warn('🟡 Auth: State changed - user signed out');
      }
      setUser(authUser);
      setLoading(false); // Set loading to false AFTER auth state is determined
    }, (authError) => {
      console.error('🔴 Auth: State error:', authError);
      clearTimeout(timeout);
      setError(authError.message);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};