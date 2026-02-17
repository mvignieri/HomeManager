import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
    // Safety timeout: if auth doesn't respond in 3 seconds, stop loading
    const timeout = setTimeout(() => {
      console.warn('Auth timeout - setting loading to false');
      setLoading(false);
    }, 3000);

    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      console.log('Auth state changed:', authUser ? 'logged in' : 'logged out');
      clearTimeout(timeout); // Clear timeout if auth responds
      setUser(authUser);
      setLoading(false); // Set loading to false AFTER auth state is determined
    }, (authError) => {
      console.error('Auth state error:', authError);
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