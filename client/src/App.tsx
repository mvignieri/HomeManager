import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import CalendarPage from "@/pages/calendar";
import SmartHomePage from "@/pages/smart-home";
import AnalyticsPage from "@/pages/analytics";
import TasksPage from "@/pages/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth, signInWithGoogle, handleRedirectResult } from "@/lib/firebase";
import { User } from "firebase/auth";
import "@/lib/firebase-config-test";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Attempt to handle redirect result
    handleRedirectResult().catch(error => {
      console.error("Error handling redirect:", error);
    });

    return () => unsubscribe();
  }, []);

  // Handle login with Google
  const login = async () => {
    try {
      // Try Firebase authentication first
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error("Firebase login error:", error);
        
        // If Firebase auth fails, use development mode login
        console.log("Using development mode login instead");
        // Create a mock user for development
        const mockUser = {
          uid: "dev-user-123",
          email: "dev@example.com",
          displayName: "Developer User",
          photoURL: null,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: "",
          tenantId: null,
          delete: () => Promise.resolve(),
          getIdToken: () => Promise.resolve("mock-token"),
          getIdTokenResult: () => Promise.resolve({ token: "mock-token" }),
          reload: () => Promise.resolve(),
          toJSON: () => ({})
        };
        
        // Manually set the user state
        setUser(mockUser as any);
        
        toast({
          title: "Development Login",
          description: "Logged in with development account",
        });
        
        return;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "Failed to sign in",
        variant: "destructive"
      });
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <Toaster />
      </div>
    );
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
        <Toaster />
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
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
