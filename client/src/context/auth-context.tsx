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

  // Handle redirect result on initial load
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        await handleRedirectResult();
      } catch (error: any) {
        console.error('Redirect error:', error);
        setError(error.message || 'Authentication failed');
        toast({
          title: 'Authentication Error',
          description: error.message || 'Failed to complete authentication',
          variant: 'destructive',
        });
      }
    };

    checkRedirect();
  }, [toast]);

  // Immediately set loading to false for development
  useEffect(() => {
    console.log('Setting loading to false immediately');
    setLoading(false);
    
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      console.log('Auth state changed:', authUser ? 'logged in' : 'logged out');
      setUser(authUser);
    }, (authError) => {
      console.error('Auth state error:', authError);
      setError(authError.message);
    });

    return () => {
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