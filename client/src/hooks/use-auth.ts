import { useCallback } from 'react';
import { signInWithGoogle, signOut } from '@/lib/firebase';
import { useToast } from './use-toast';
import { useAuth as useAuthContext } from '@/context/auth-context';

export function useAuth() {
  const { user, loading, error } = useAuthContext();
  const { toast } = useToast();

  const login = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out',
      });
    } catch (error: any) {
      toast({
        title: 'Sign Out Error',
        description: error.message || 'Failed to sign out',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    user,
    loading,
    error,
    login,
    logout,
  };
}
