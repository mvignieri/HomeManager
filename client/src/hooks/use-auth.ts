import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGoogle, signOut, handleRedirectResult } from '@/lib/firebase';
import { useToast } from './use-toast';
import { useAppContext } from '@/context/app-context';

export function useAuth() {
  const { user, loading } = useAppContext();
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

  // Handle redirect on initial load
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        await handleRedirectResult();
      } catch (error: any) {
        console.error('Redirect error:', error);
        toast({
          title: 'Authentication Error',
          description: error.message || 'Failed to complete authentication',
          variant: 'destructive',
        });
      }
    };

    checkRedirect();
  }, [toast]);

  return {
    user,
    loading,
    login,
    logout,
  };
}
