import { useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import CalendarPage from "@/pages/calendar";
import SmartHomePage from "@/pages/smart-home";
import AnalyticsPage from "@/pages/analytics";
import TasksPage from "@/pages/tasks";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/websocket";

function Router() {
  const { user, loading } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);
  
  // Connect to WebSocket for real-time updates when the user is authenticated
  // The WebSocket connection is optional and won't block the app if it fails
  const { connected } = useWebSocket();

  useEffect(() => {
    // Listen for location changes
    const onLocationChange = () => {
      setPathname(window.location.pathname);
    };
    
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/smart-home" component={SmartHomePage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
