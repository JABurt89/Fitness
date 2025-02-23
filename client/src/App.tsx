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

function Router() {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className={`
        flex-1 
        overflow-y-auto 
        bg-background 
        ${isMobile ? 'px-4 py-4' : 'p-6'}
        ${isMobile ? 'pb-16' : ''} 
        w-full
        max-w-full
      `}>
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