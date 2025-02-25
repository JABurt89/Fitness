import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Exercises from "@/pages/Exercises";
import WorkoutDays from "@/pages/WorkoutDays";
import WorkoutLog from "@/pages/WorkoutLog";
import WeightTracker from "@/pages/WeightTracker";
import BeginWorkout from "@/pages/BeginWorkout";
import FutureWorkout from "@/pages/FutureWorkout";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function Router() {
  const isMobile = useIsMobile();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        <SidebarProvider defaultOpen={!isMobile}>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main
              className={cn(
                "flex-1 overflow-y-auto",
                "px-4 py-4 md:px-6 md:py-6",
                "w-full max-w-full min-h-screen",
                "transition-all duration-300 ease-in-out",
                isMobile && "pt-16" // Space for mobile navigation at top
              )}
            >
              <div className="mx-auto max-w-7xl w-full">
                <Switch>
                  <ProtectedRoute path="/" component={Dashboard} />
                  <ProtectedRoute path="/begin-workout" component={BeginWorkout} />
                  <ProtectedRoute path="/exercises" component={Exercises} />
                  <ProtectedRoute path="/workout-days" component={WorkoutDays} />
                  <ProtectedRoute path="/workout-log" component={WorkoutLog} />
                  <ProtectedRoute path="/weight-tracker" component={WeightTracker} />
                  <ProtectedRoute path="/future-workout" component={FutureWorkout} />
                  <Route component={NotFound} />
                </Switch>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;