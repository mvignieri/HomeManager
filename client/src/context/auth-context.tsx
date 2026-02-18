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
    console.log('🔵 AuthProvider: Initializing');

    // Check current auth state immediately
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('🔵 AuthProvider: Current user found:', currentUser.email);
      setUser(currentUser);
      setLoading(false);
    } else {
      console.log('🔵 AuthProvider: No current user');
    }

    // Safety timeout: if auth doesn't respond in 2 seconds, stop loading
    const timeout = setTimeout(() => {
      console.log('🔵 AuthProvider: Safety timeout reached');
      setLoading(false);
    }, 2000);

    // Handle redirect result (if user is returning from Google sign-in)
    handleRedirectResult().then(user => {
      if (user) {
        console.log('🔵 AuthProvider: Redirect result - user:', user.email);
      }
    }).catch((error) => {
      // Ignore errors - onAuthStateChanged will handle the user
      console.error('🔴 AuthProvider: Error handling redirect:', error);
    });

    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      clearTimeout(timeout); // Clear timeout if auth responds
      console.log('🔵 AuthProvider: Auth state changed:', authUser ? authUser.email : 'null');
      setUser(authUser);
      setLoading(false); // Set loading to false AFTER auth state is determined
    }, (authError) => {
      console.error('🔴 AuthProvider: Auth state error:', authError);
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