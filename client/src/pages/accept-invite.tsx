import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAppContext } from '@/context/app-context';
import { Loader2, CheckCircle, XCircle, Home as HomeIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signInWithGoogle } from '@/lib/firebase';

export default function AcceptInvitePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  // Get token from URL query params
  const token = new URLSearchParams(window.location.search).get('token');
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const { setCurrentHouse } = useAppContext();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Handle Google Sign-In
  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await signInWithGoogle();
      // After login, the auth state will change and trigger the auto-accept
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
      setLoggingIn(false);
    }
  };

  // Get current database user
  const { data: dbUser, isLoading: isLoadingDbUser } = useQuery({
    queryKey: ['/api/users/me', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      const res = await fetch(`/api/users/me?uid=${firebaseUser.uid}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch current user');
      }
      return res.json();
    },
    enabled: !!firebaseUser,
    retry: 1,
  });

  // Save token to localStorage when page loads
  React.useEffect(() => {
    if (token) {
      localStorage.setItem('pendingInviteToken', token);
    }
  }, [token]);

  // Fetch invitation details
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: [`/api/invitations/${token}`],
    queryFn: async () => {
      if (!token) throw new Error('No invitation token provided');
      const res = await fetch(`/api/invitations/${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch invitation');
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token || !dbUser) throw new Error('Missing required data');
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: dbUser.id }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
      return res.json();
    },
    onSuccess: async (data) => {
      setAccepted(true);
      setCurrentHouse(data.house);
      // Clear the pending token
      localStorage.removeItem('pendingInviteToken');
      toast({
        title: 'Success!',
        description: `You've successfully joined ${data.house.name}`,
      });
      // Invalidate queries to refresh houses and invitations
      // Use firebaseUser.uid to match the query key in app-context
      await queryClient.invalidateQueries({ queryKey: ['/api/houses', firebaseUser?.uid] });
      await queryClient.invalidateQueries({ queryKey: ['/api/invitations/pending', dbUser?.email] });
      // Wait for queries to refetch before redirecting
      setTimeout(() => {
        setLocation('/');
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset loggingIn state when user logs in successfully or after timeout
  useEffect(() => {
    if (firebaseUser && loggingIn) {
      setLoggingIn(false);
    }

    // Safety timeout: reset loggingIn after 10 seconds if still true
    if (loggingIn) {
      const timeout = setTimeout(() => {
        setLoggingIn(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [firebaseUser, loggingIn]);

  // Auto-accept if user is logged in and invitation is valid
  useEffect(() => {
    if (inviteData && dbUser && !accepted && !acceptMutation.isPending) {
      // Check if user's email matches invitation email
      if (dbUser.email === inviteData.invitation.email) {
        acceptMutation.mutate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteData, dbUser, accepted]);

  // Check for token first
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <XCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              No invitation token was provided in the URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation error (before loading checks so errors are shown immediately)
  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <XCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {(error as Error).message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading spinner while auth or invitation is loading
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-center text-gray-600">
              {authLoading ? 'Checking authentication...' : 'Loading invitation...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isPending || accepted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            {accepted ? (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-center text-lg font-semibold mb-2">Success!</p>
                <p className="text-center text-gray-600">
                  You've joined {inviteData?.house.name}. Redirecting...
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-center text-gray-600">Accepting invitation...</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation details and prompt to login/register if not logged in
  if (!firebaseUser || !dbUser) {
    // Show loading state while logging in OR while loading dbUser
    if (loggingIn || (firebaseUser && isLoadingDbUser)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-center text-gray-600">
                {loggingIn ? 'Signing in...' : 'Loading user data...'}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <HomeIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle className="text-center">House Invitation</CardTitle>
            <CardDescription className="text-center">
              You've been invited to join {inviteData?.house.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">House Name</p>
              <p className="font-semibold">{inviteData?.house.name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Your Role</p>
              <p className="font-semibold capitalize">{inviteData?.invitation.role}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Please sign in with the email address{' '}
                <span className="font-semibold">{inviteData?.invitation.email}</span> to accept
                this invitation.
              </p>
              <Button
                onClick={handleLogin}
                disabled={loggingIn}
                className="w-full flex items-center justify-center"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.198-2.702-6.735-2.702-5.523 0-10 4.477-10 10s4.477 10 10 10c8.396 0 10-7.261 10-10 0-0.635-0.057-1.252-0.164-1.841h-9.836z" fill="currentColor"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if email doesn't match
  if (dbUser.email !== inviteData?.invitation.email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <XCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <CardTitle className="text-center">Email Mismatch</CardTitle>
            <CardDescription className="text-center">
              This invitation was sent to {inviteData?.invitation.email}, but you're signed in as{' '}
              {dbUser.email}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Please sign out and sign in with the correct email address to accept this invitation.
            </p>
            <Button onClick={() => setLocation('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should rarely show since we auto-accept above
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <HomeIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
          <CardTitle className="text-center">House Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join {inviteData?.house.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">House Name</p>
            <p className="font-semibold">{inviteData?.house.name}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Your Role</p>
            <p className="font-semibold capitalize">{inviteData?.invitation.role}</p>
          </div>
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="w-full"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
