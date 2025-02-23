import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Exercises from "@/pages/Exercises";
import WorkoutDays from "@/pages/WorkoutDays";
import WorkoutLog from "@/pages/WorkoutLog";
import WeightTracker from "@/pages/WeightTracker";
import BeginWorkout from "@/pages/BeginWorkout";
import Sidebar from "@/components/layout/Sidebar";
import FutureWorkout from "@/pages/FutureWorkout";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function Router() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className={cn(
          "flex-1 overflow-y-auto",
          "px-4 py-4 md:px-6 md:py-6",
          "w-full max-w-full min-h-screen",
          "transition-all duration-300 ease-in-out",
          isMobile && "pt-16" // Space for mobile navigation at top
        )}>
          <div className="mx-auto max-w-7xl w-full">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/begin-workout" component={BeginWorkout} />
              <Route path="/exercises" component={Exercises} />
              <Route path="/workout-days" component={WorkoutDays} />
              <Route path="/workout-log" component={WorkoutLog} />
              <Route path="/weight-tracker" component={WeightTracker} />
              <Route path="/future-workout" component={FutureWorkout} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;