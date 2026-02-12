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
import "@/lib/firebase-config-test";

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
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      return users.find((u: any) => u.uid === user.uid);
    },
    enabled: !!user,
  });

  // Check for pending invitations
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['/api/invitations/pending', dbUser?.email],
    queryFn: async () => {
      if (!dbUser) return [];
      // Get all invitations for this email
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
    enabled: !!dbUser && houses.length > 0,
  });

  // Show create house modal when user has no houses and no pending invitations
  React.useEffect(() => {
    if (user && dbUser && houses.length === 0 && pendingInvitations.length === 0 && !loading) {
      // Don't show modal if we're on the accept-invite page
      if (!location.startsWith('/accept-invite')) {
        setShowCreateHouseModal(true);
      }
    } else {
      setShowCreateHouseModal(false);
    }
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
              <h1 className="text-3xl font-bold text-gray-900">HomeTask</h1>
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

  // Show main application if authenticated
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
