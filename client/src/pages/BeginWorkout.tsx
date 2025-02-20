import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { WorkoutDay, Exercise, WorkoutLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import ExerciseLogger from "@/components/workout/ExerciseLogger";
import { generateWorkoutSuggestions, calculateOneRMTrend } from "@/lib/workoutCalculator";
import type { WorkoutSuggestion } from "@/lib/workoutCalculator";

export default function BeginWorkout() {
  const { toast } = useToast();
  const [activeWorkout, setActiveWorkout] = useState<WorkoutDay | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutSuggestion, setWorkoutSuggestion] = useState<WorkoutSuggestion | null>(null);

  const { data: workoutDays, isLoading: loadingWorkouts } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout-days'],
  });

  const { data: exercises, isLoading: loadingExercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises']
  });

  const { data: workoutLogs } = useQuery<WorkoutLog[]>({
    queryKey: ['/api/workout-logs'],
    enabled: !!activeWorkout
  });

  const skipWorkout = useMutation({
    mutationFn: async (workoutDay: WorkoutDay) => {
      // Get max display order
      const maxOrder = Math.max(...(workoutDays?.map(w => w.displayOrder ?? 0) ?? [0]));

      return await apiRequest('PATCH', `/api/workout-days/${workoutDay.id}`, {
        displayOrder: maxOrder + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout skipped" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to skip workout",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive" 
      });
    }
  });

  const updateWorkoutCompletion = useMutation({
    mutationFn: async (workoutId: number) => {
      // Get max display order
      const maxOrder = Math.max(...(workoutDays?.map(w => w.displayOrder ?? 0) ?? [0]));

      return await apiRequest('PATCH', `/api/workout-days/${workoutId}`, {
        lastCompleted: new Date().toISOString(),
        displayOrder: maxOrder + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout completed" });
    }
  });

  const startWorkout = (workout: WorkoutDay) => {
    const currentExercise = exercises?.find(e => e.name === workout.exercises[0]);
    if (!currentExercise) {
      toast({ 
        title: "Error starting workout",
        description: "Exercise not found",
        variant: "destructive"
      });
      return;
    }

    const exerciseLogs = workoutLogs
      ?.filter(log => log.exercise === currentExercise.name)
      .slice(-5)
      .map(log => ({
        ...log,
        calculatedOneRM: Number(log.calculatedOneRM)
      }));

    let currentOneRM: number;

    if (exerciseLogs?.length) {
      const { nextOneRM } = calculateOneRMTrend(exerciseLogs);
      currentOneRM = nextOneRM;
    } else {
      // Default to a conservative estimate if no logs exist
      currentOneRM = 20; // You might want to adjust this default
    }

    const suggestions = generateWorkoutSuggestions(currentOneRM, {
      setsRange: currentExercise.setsRange,
      repsRange: currentExercise.repsRange,
      weightIncrement: parseFloat(currentExercise.weightIncrement),
      startingWeightType: "Barbell", // Default to barbell
      customStartingWeight: undefined
    });

    if (suggestions.length > 0) {
      setWorkoutSuggestion(suggestions[0]);
      setActiveWorkout(workout);
      setCurrentExerciseIndex(0);
    } else {
      toast({ 
        title: "Error starting workout",
        description: "Could not generate workout suggestions",
        variant: "destructive"
      });
    }
  };

  const handleExerciseComplete = () => {
    if (!activeWorkout) return;

    const nextIndex = currentExerciseIndex + 1;

    if (nextIndex >= activeWorkout.exercises.length) {
      // Workout complete
      updateWorkoutCompletion.mutate(activeWorkout.id);
      setActiveWorkout(null);
      setCurrentExerciseIndex(0);
      setWorkoutSuggestion(null);
      return;
    }

    // Calculate suggestion for next exercise
    const nextExercise = exercises?.find(e => e.name === activeWorkout.exercises[nextIndex]);
    if (!nextExercise) {
      toast({ 
        title: "Error loading next exercise",
        description: "Exercise not found",
        variant: "destructive"
      });
      return;
    }

    const exerciseLogs = workoutLogs
      ?.filter(log => log.exercise === nextExercise.name)
      .slice(-5)
      .map(log => ({
        ...log,
        calculatedOneRM: Number(log.calculatedOneRM)
      }));

    let currentOneRM: number;

    if (exerciseLogs?.length) {
      const { nextOneRM } = calculateOneRMTrend(exerciseLogs);
      currentOneRM = nextOneRM;
    } else {
      currentOneRM = 20; // Default
    }

    const suggestions = generateWorkoutSuggestions(currentOneRM, {
      setsRange: nextExercise.setsRange,
      repsRange: nextExercise.repsRange,
      weightIncrement: parseFloat(nextExercise.weightIncrement),
      startingWeightType: "Barbell", // Default to barbell
      customStartingWeight: undefined
    });

    if (suggestions.length > 0) {
      setWorkoutSuggestion(suggestions[0]);
      setCurrentExerciseIndex(nextIndex);
    } else {
      toast({ 
        title: "Error loading next exercise",
        description: "Could not generate workout suggestions",
        variant: "destructive"
      });
    }
  };

  if (loadingWorkouts || loadingExercises) {
    return <div>Loading workouts...</div>;
  }

  const sortedWorkouts = workoutDays?.sort((a, b) => 
    (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  ) ?? [];

  if (activeWorkout && workoutSuggestion) {
    const currentExercise = exercises?.find(e => 
      e.name === activeWorkout.exercises[currentExerciseIndex]
    );

    if (!currentExercise) return <div>Exercise not found</div>;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{activeWorkout.dayName}</h1>
          <div className="text-sm text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {activeWorkout.exercises.length}
          </div>
        </div>

        <ExerciseLogger
          exercise={currentExercise}
          suggestion={workoutSuggestion}
          onComplete={handleExerciseComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Begin Workout</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Workout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedWorkouts.map((workout, index) => (
              <div key={workout.id} className="flex items-center gap-2">
                {index === 0 ? (
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => startWorkout(workout)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start {workout.dayName}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => skipWorkout.mutate(workout)}
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </Button>
                  </div>
                ) : (
                  <div className="w-full p-4 border rounded-lg bg-muted">
                    <div className="flex justify-between items-center">
                      <span>{workout.dayName}</span>
                      <span className="text-sm text-muted-foreground">
                        {workout.lastCompleted
                          ? `Last: ${new Date(workout.lastCompleted).toLocaleDateString()}`
                          : 'Never completed'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}