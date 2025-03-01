import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkoutDay, Exercise, WorkoutLog } from "@shared/schema";
import ExerciseLogger from "@/components/workout/ExerciseLogger";
import { generateWorkoutSuggestions, calculateOneRMTrend } from "@/lib/workoutCalculator";
import type { WorkoutSuggestion } from "@/lib/workoutCalculator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const previousWorkoutSchema = z.object({
  weight: z.string().transform(val => Number(val)),
  reps: z.string().transform(val => Number(val)),
  sets: z.string().transform(val => Number(val)),
});

type PreviousWorkoutData = z.infer<typeof previousWorkoutSchema>;

export default function BeginWorkout() {
  const { toast } = useToast();
  const [activeWorkout, setActiveWorkout] = useState<WorkoutDay | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutSuggestion, setWorkoutSuggestion] = useState<WorkoutSuggestion | null>(null);
  const [showPreviousWorkoutDialog, setShowPreviousWorkoutDialog] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState<{workout: WorkoutDay, exercise: Exercise} | null>(null);
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const previousWorkoutForm = useForm<PreviousWorkoutData>({
    resolver: zodResolver(previousWorkoutSchema),
    defaultValues: {
      weight: "0",
      reps: "0",
      sets: "0",
    }
  });

  const { data: workoutDays, isLoading: loadingWorkouts } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout-days']
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

  const createHistoricalLog = useMutation({
    mutationFn: async (data: { exercise: string, weight: number, sets: number, reps: number }) => {
      const oneRM = Number(data.weight * (1 + (data.reps / 30)));
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const logData = {
        exercise: data.exercise,
        completedSets: Number(data.sets),
        targetReps: Number(data.reps),
        weight: Number(data.weight),
        failedRep: 0,
        calculatedOneRM: oneRM,
        date: yesterday
      };

      console.log('Submitting workout log with types:', {
        data: logData,
        types: {
          completedSets: typeof logData.completedSets,
          targetReps: typeof logData.targetReps,
          weight: typeof logData.weight,
          failedRep: typeof logData.failedRep,
          calculatedOneRM: typeof logData.calculatedOneRM,
          date: typeof logData.date
        }
      });

      return await apiRequest('POST', '/api/workout-logs', logData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Previous workout logged successfully" });

      if (pendingWorkout) {
        const weight = Number(previousWorkoutForm.getValues().weight);
        const reps = Number(previousWorkoutForm.getValues().reps);
        // Calculate current one rep max
        const currentOneRM = weight * (1 + (reps / 30));

        console.log('Generating suggestions with:', {
          currentOneRM,
          exercise: pendingWorkout.exercise
        });

        const newSuggestions = generateWorkoutSuggestions(currentOneRM, {
          setsRange: pendingWorkout.exercise.setsRange,
          repsRange: pendingWorkout.exercise.repsRange,
          weightIncrement: parseFloat(pendingWorkout.exercise.weightIncrement),
          startingWeightType: "Barbell",
          customStartingWeight: undefined
        });

        console.log('Generated suggestions:', newSuggestions);

        if (newSuggestions && newSuggestions.length > 0) {
          setSuggestions(newSuggestions.slice(0, 10));
          setShowSuggestions(true);
          setShowPreviousWorkoutDialog(false);
        } else {
          toast({ 
            title: "Error generating suggestions",
            description: "Could not generate workout suggestions",
            variant: "destructive"
          });
        }
      }
    },
    onError: (error: any) => {
      console.error('Failed to log workout:', error);
      toast({ 
        title: "Failed to log previous workout",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });

  const updateWorkoutCompletion = useMutation({
    mutationFn: async (workoutId: number) => {
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

    if (!exerciseLogs?.length) {
      setPendingWorkout({ workout, exercise: currentExercise });
      setShowPreviousWorkoutDialog(true);
      return;
    }

    generateSuggestionsFromHistory(workout, currentExercise);
  };

  const generateSuggestionsFromHistory = (workout: WorkoutDay, exercise: Exercise) => {
    const exerciseLogs = workoutLogs
      ?.filter(log => log.exercise === exercise.name)
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
      currentOneRM = 20;
    }

    const newSuggestions = generateWorkoutSuggestions(currentOneRM, {
      setsRange: exercise.setsRange,
      repsRange: exercise.repsRange,
      weightIncrement: parseFloat(exercise.weightIncrement),
      startingWeightType: "Barbell",
      customStartingWeight: undefined
    });

    if (newSuggestions.length > 0) {
      setSuggestions(newSuggestions.slice(0, 10));
      setShowSuggestions(true);
      setPendingWorkout({ workout, exercise });
    } else {
      toast({ 
        title: "Error starting workout",
        description: "Could not generate workout suggestions",
        variant: "destructive"
      });
    }
  };

  const selectSuggestion = (suggestion: WorkoutSuggestion) => {
    if (!pendingWorkout) return;

    setWorkoutSuggestion(suggestion);
    setActiveWorkout(pendingWorkout.workout);
    setCurrentExerciseIndex(0);
    setPendingWorkout(null);
    setShowSuggestions(false);
  };

  const handlePreviousWorkoutSubmit = (data: PreviousWorkoutData) => {
    if (!pendingWorkout) return;

    createHistoricalLog.mutate({
      exercise: pendingWorkout.exercise.name,
      weight: Number(data.weight),
      sets: Number(data.sets),
      reps: Number(data.reps)
    });
    setShowPreviousWorkoutDialog(false);
    previousWorkoutForm.reset();
  };

  const handleExerciseComplete = () => {
    if (!activeWorkout) return;

    const nextIndex = currentExerciseIndex + 1;

    if (nextIndex >= activeWorkout.exercises.length) {
      updateWorkoutCompletion.mutate(activeWorkout.id);
      setActiveWorkout(null);
      setCurrentExerciseIndex(0);
      setWorkoutSuggestion(null);
      return;
    }

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

    if (!exerciseLogs?.length) {
      setPendingWorkout({ workout: activeWorkout, exercise: nextExercise });
      setShowPreviousWorkoutDialog(true);
      return;
    }

    generateSuggestionsFromHistory(activeWorkout, nextExercise);
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

      <Dialog open={showPreviousWorkoutDialog} onOpenChange={setShowPreviousWorkoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Previous Workout Details</DialogTitle>
            <DialogDescription>
              Please enter the details of your last {pendingWorkout?.exercise?.name} workout to help generate appropriate suggestions.
            </DialogDescription>
          </DialogHeader>
          <Form {...previousWorkoutForm}>
            <form onSubmit={previousWorkoutForm.handleSubmit(handlePreviousWorkoutSubmit)} className="space-y-4">
              <FormField
                control={previousWorkoutForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={previousWorkoutForm.control}
                name="sets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sets Completed</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={previousWorkoutForm.control}
                name="reps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reps per Set</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                <Calculator className="w-4 h-4 mr-2" />
                Generate Suggestions
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose Your Workout</DialogTitle>
            <DialogDescription>
              Select from the following workout suggestions based on your previous performance.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Sets</th>
                  <th className="p-2 text-left font-medium">Reps</th>
                  <th className="p-2 text-left font-medium">Weight (kg)</th>
                  <th className="p-2 text-left font-medium">Est. 1RM (kg)</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((suggestion, index) => (
                  <tr
                    key={index}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-2">{suggestion.sets}</td>
                    <td className="p-2">{suggestion.reps}</td>
                    <td className="p-2">{suggestion.weight.toFixed(2)}</td>
                    <td className="p-2">
                      {suggestion.estimatedOneRM.toFixed(2)}
                    </td>
                    <td className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}