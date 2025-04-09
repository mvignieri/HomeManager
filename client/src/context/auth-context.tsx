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

  // Listen for auth state changes
  useEffect(() => {
    // Set a timeout to exit loading state in case Firebase auth doesn't respond
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Firebase auth timeout reached, exiting loading state');
        setLoading(false);
      }
    }, 3000);
    
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      // Clear the timeout since we received a response
      clearTimeout(timeoutId);
      
      setUser(authUser);
      setLoading(false);
    }, (authError) => {
      clearTimeout(timeoutId);
      console.error('Auth state error:', authError);
      setError(authError.message);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [loading]);

  const value = {
    user,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};