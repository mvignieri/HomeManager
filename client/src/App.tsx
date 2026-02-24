import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import CalendarPage from "@/pages/calendar";
import SmartHomePage from "@/pages/smart-home";
import AnalyticsPage from "@/pages/analytics";
import TasksPage from "@/pages/tasks";
import ShoppingListPage from "@/pages/shopping-list";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import AcceptInvitePage from "@/pages/accept-invite";
import InvitationsPage from "@/pages/invitations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle, signOut } from "@/lib/firebase";
import { useAppContext } from "@/context/app-context";
import CreateHouseModal from "@/components/create-house-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import { useWebPush } from "@/hooks/use-web-push";
import { usePusher } from "@/hooks/use-pusher";
import { useQuery } from "@tanstack/react-query";
import React from "react";

function App() {
  const { user, loading, houses, refreshHouses, showCreateHouseModal, setShowCreateHouseModal, currentHouse } = useAppContext();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Initialize Web Push subscription
  useWebPush();

  // Get current database user
  // Use retry logic to handle race condition where user might not be created yet after login
  const { data: dbUser } = useQuery({
    queryKey: ['/api/users/me', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/users/me?uid=${user.uid}`);
      if (!res.ok) {
        if (res.status === 404) {
          // User not found - might be being created, throw to trigger retry
          console.warn('🟡 App: User not found in database yet, will retry...');
          throw new Error('User not found in database yet');
        }
        throw new Error('Failed to fetch current user');
      }
      console.warn('🟢 App: User loaded from database:', user.email);
      return res.json();
    },
    enabled: !!user,
    retry: 5, // Retry up to 5 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff: 1s, 2s, 4s, 5s, 5s
  });

  // Check for pending invitations by email
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['/api/invitations/pending', dbUser?.email],
    queryFn: async () => {
      if (!dbUser?.email) return [];

      const res = await fetch(`/api/invitations/by-email/${encodeURIComponent(dbUser.email)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!dbUser?.email,
    refetchOnMount: 'always',
  });

  // Initialize Pusher for real-time updates
  usePusher(currentHouse?.id, dbUser?.id);

  // Handle login with Google
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const login = async () => {
    if (isLoggingIn) return; // Prevent multiple clicks

    try {
      setIsLoggingIn(true);
      console.warn('🔵 App: Starting login');
      await signInWithGoogle();
      console.warn('🟢 App: Login successful');
    } catch (error: any) {
      console.error("🔴 App: Firebase login error:", error);

      // Don't show error for cancelled popup (user closed it or clicked multiple times)
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.warn('🟡 App: Popup cancelled by user');
        return;
      }

      toast({
        title: "Login Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      console.warn('🔵 App: Logging out user');
      await signOut();
      console.warn('🟢 App: User logged out successfully');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    } catch (error: any) {
      console.error("🔴 App: Logout error:", error);
      toast({
        title: "Logout Error",
        description: error.message || "Failed to log out",
        variant: "destructive"
      });
    }
  };

  // Show loading spinner - also show while dbUser is loading
  if (loading || (user && !dbUser && !location.startsWith('/accept-invite'))) {
    console.warn('🔵 App: Loading state:', {
      loading,
      hasUser: !!user,
      hasDbUser: !!dbUser,
      location,
      userEmail: user?.email
    });

    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">
          {loading ? 'Loading...' : 'Setting up your account...'}
        </p>
      </div>
    );
  }

  // Allow access to accept-invite page (with or without authentication)
  if (location.startsWith('/accept-invite')) {
    return <AcceptInvitePage />;
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-6">
        <Card className="w-full max-w-md bg-white rounded-xl shadow-lg">
          <CardContent className="p-8 space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">HomeManager</h1>
              <p className="mt-2 text-gray-600">Your smart home task manager</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={login}
                disabled={isLoggingIn}
                variant="outline"
                className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.198-2.702-6.735-2.702-5.523 0-10 4.477-10 10s4.477 10 10 10c8.396 0 10-7.261 10-10 0-0.635-0.057-1.252-0.164-1.841h-9.836z" fill="#4285F4"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500 mt-8">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Block navigation if user has no house (except accept-invite page)
  const shouldShowGate = user && dbUser && houses.length === 0 && !location.startsWith('/accept-invite');

  if (shouldShowGate) {
    return (
      <>
        <div className="flex flex-col h-screen bg-gradient-to-b from-indigo-500 to-purple-600">
          <div className="flex-grow flex items-center justify-center p-6">
            <Card className="max-w-lg w-full bg-white">
              <CardContent className="p-8 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HomeManager!</h1>
                  <p className="text-gray-600 mb-6">
                    To get started, you need to either create your own house or accept an invitation from someone else.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Show pending invitations if available */}
                  {pendingInvitations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-blue-900">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                        <h4 className="font-semibold text-sm">You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}!</h4>
                      </div>
                      {pendingInvitations.map((inv: any) => (
                        <div key={inv.id} className="bg-white rounded p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{inv.house.name}</p>
                              <p className="text-xs text-gray-600">Role: <span className="capitalize font-medium">{inv.role}</span></p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                // Navigate to accept-invite page with token
                                setLocation(`/accept-invite?token=${inv.token}`);
                              }}
                              className="text-xs"
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full py-6 text-lg"
                    size="lg"
                    onClick={() => setShowCreateHouseModal(true)}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Your First House
                  </Button>

                  {pendingInvitations.length === 0 && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">or</span>
                        </div>
                      </div>

                      <p className="text-sm text-center text-gray-500">
                        If you received an invitation email, click the link to join an existing house.
                      </p>
                    </>
                  )}

                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {user?.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-gray-600">
                              {user?.email?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium text-gray-700">{user?.displayName || 'User'}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create House Modal - MUST be shown */}
        {dbUser && (
          <CreateHouseModal
            open={showCreateHouseModal}
            userId={dbUser.id}
            onOpenChange={setShowCreateHouseModal}
            onSuccess={() => {
              refreshHouses();
              setShowCreateHouseModal(false);
              toast({
                title: 'House Created!',
                description: 'Welcome to your new house. You are now the owner.',
              });
            }}
          />
        )}

        {/* PWA Install Prompt */}
        {user && <PWAInstallPrompt />}
      </>
    );
  }

  // Show main application if authenticated AND has a house
  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/smart-home" component={SmartHomePage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/shopping-list" component={ShoppingListPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/accept-invite" component={AcceptInvitePage} />
        <Route path="/invitations" component={InvitationsPage} />
        <Route component={NotFound} />
      </Switch>

      {/* Create House Modal */}
      {dbUser && (
        <CreateHouseModal
          open={showCreateHouseModal}
          userId={dbUser.id}
          onOpenChange={setShowCreateHouseModal}
          onSuccess={() => {
            refreshHouses();
            setShowCreateHouseModal(false);
          }}
        />
      )}

      {/* PWA Install Prompt */}
      {user && <PWAInstallPrompt />}
    </>
  );
}

export default App;
