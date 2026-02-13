import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import CalendarPage from "@/pages/calendar";
import SmartHomePage from "@/pages/smart-home";
import AnalyticsPage from "@/pages/analytics";
import TasksPage from "@/pages/tasks";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import AcceptInvitePage from "@/pages/accept-invite";
import InvitationsPage from "@/pages/invitations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";
import { useAppContext } from "@/context/app-context";
import CreateHouseModal from "@/components/create-house-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import { useFCM } from "@/hooks/use-fcm";
import { useQuery } from "@tanstack/react-query";
import React from "react";

function App() {
  const { user, loading, houses, refreshHouses, showCreateHouseModal, setShowCreateHouseModal } = useAppContext();
  const { toast } = useToast();
  const [location] = useLocation();

  // Initialize Firebase Cloud Messaging
  useFCM();

  // Get current database user
  const { data: dbUser } = useQuery({
    queryKey: ['/api/users/me', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/users/me?uid=${user.uid}`);
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('User not found in database');
          return null;
        }
        throw new Error('Failed to fetch current user');
      }
      return res.json();
    },
    enabled: !!user,
    retry: 1,
  });

  // Check for pending invitations
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['/api/invitations/pending', dbUser?.email],
    queryFn: async () => {
      if (!dbUser?.email) return [];

      // If user has no houses yet, they can't check invitations via houses
      // This query would need a dedicated endpoint like GET /api/invitations/by-email/:email
      // For now, return empty array if no houses
      if (houses.length === 0) {
        return [];
      }

      // Get all invitations for this email from all houses
      const allInvites = await Promise.all(
        houses.map(async (house) => {
          const res = await fetch(`/api/houses/${house.id}/invitations`);
          if (!res.ok) return [];
          return res.json();
        })
      );
      const flat = allInvites.flat();
      return flat.filter((inv: any) => inv.email === dbUser.email && inv.status === 'pending');
    },
    enabled: !!dbUser?.email,
  });

  // Debug logging for house creation
  React.useEffect(() => {
    console.log('House Creation Debug:', {
      hasUser: !!user,
      hasDbUser: !!dbUser,
      housesCount: houses.length,
      pendingInvitationsCount: pendingInvitations.length,
      loading,
      location,
    });
  }, [user, dbUser, houses, pendingInvitations, loading, location]);

  // Handle login with Google
  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({
        title: "Login Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow access to accept-invite page without authentication
  if (!user && location.startsWith('/accept-invite')) {
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
                variant="outline"
                className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.198-2.702-6.735-2.702-5.523 0-10 4.477-10 10s4.477 10 10 10c8.396 0 10-7.261 10-10 0-0.635-0.057-1.252-0.164-1.841h-9.836z" fill="#4285F4"/>
                </svg>
                Sign in with Google
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
  if (user && dbUser && houses.length === 0 && !location.startsWith('/accept-invite')) {
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
