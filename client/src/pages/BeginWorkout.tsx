import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Play } from "lucide-react";
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

  const reorderWorkouts = useMutation({
    mutationFn: async (updates: { id: number; displayOrder: number }[]) => {
      return await apiRequest('PATCH', '/api/workout-days/reorder', {
        workouts: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout order updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update workout order",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive" 
      });
    }
  });

  const updateWorkoutCompletion = useMutation({
    mutationFn: async (workoutId: number) => {
      return await apiRequest('PATCH', `/api/workout-days/${workoutId}`, {
        lastCompleted: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout completed" });
    }
  });

  const moveWorkout = (workoutId: number, direction: 'up' | 'down') => {
    if (!workoutDays) return;

    const sortedWorkouts = [...workoutDays].sort((a, b) => 
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );

    const currentIndex = sortedWorkouts.findIndex(w => w.id === workoutId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedWorkouts.length) return;

    const updates = [
      { id: sortedWorkouts[currentIndex].id, displayOrder: newIndex },
      { id: sortedWorkouts[newIndex].id, displayOrder: currentIndex }
    ];

    reorderWorkouts.mutate(updates);
  };

  const startWorkout = (workout: WorkoutDay) => {
    setActiveWorkout(workout);
    setCurrentExerciseIndex(0);

    // Calculate suggestion for first exercise
    const currentExercise = exercises?.find(e => e.name === workout.exercises[0]);
    if (!currentExercise) return;

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
      customStartingWeight: null
    });

    setWorkoutSuggestion(suggestions[0]); // Use the first suggestion
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
    if (!nextExercise) return;

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
      customStartingWeight: null
    });

    setWorkoutSuggestion(suggestions[0]);
    setCurrentExerciseIndex(nextIndex);
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
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveWorkout(workout.id, 'up')}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === sortedWorkouts.length - 1}
                    onClick={() => moveWorkout(workout.id, 'down')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => startWorkout(workout)}
                >
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    {workout.dayName}
                  </span>
                  <span className="text-muted-foreground">
                    {workout.lastCompleted
                      ? `Last: ${new Date(workout.lastCompleted).toLocaleDateString()}`
                      : 'Never completed'}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}