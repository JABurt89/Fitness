import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Exercise, WorkoutLog } from "@shared/schema";
import type { WorkoutSuggestion } from "@/lib/workoutCalculator";
import { Check, X, Plus, Minus } from "lucide-react";

interface ExerciseLoggerProps {
  exercise: Exercise;
  suggestion?: WorkoutSuggestion;  // Make suggestion optional
  onComplete: () => void;
}

export default function ExerciseLogger({ exercise, suggestion, onComplete }: ExerciseLoggerProps) {
  const { toast } = useToast();
  const [sets, setSets] = useState<Array<{ completed: boolean; failedRep?: number }>>([]);

  // Initialize with one set if no suggestion is provided
  useEffect(() => {
    const initialSets = [{ completed: false }];  // Always start with one set
    setSets(initialSets);
  }, []);

  const logWorkout = useMutation({
    mutationFn: async (log: Omit<WorkoutLog, "id" | "date">) => {
      console.log('Attempting to log workout with data:', log);
      try {
        const response = await apiRequest('POST', '/api/workout-logs', {
          ...log,
          completedSets: log.completedSets.toString(),
          targetReps: log.targetReps.toString(),
          weight: log.weight.toString(),
          failedRep: log.failedRep.toString(),
          calculatedOneRM: log.calculatedOneRM.toString()
        });
        return response;
      } catch (error) {
        console.error('Mutation error details:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Workout logged successfully" });
      onComplete();
    },
    onError: (error) => {
      console.error('Workout log error details:', {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        response: error instanceof Error ? (error as any).response?.data : undefined
      });
      toast({
        title: "Failed to log workout",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  });

  const handleSetCompletion = (index: number, completed: boolean, failedRep?: number) => {
    const newSets = [...sets];
    newSets[index] = { completed, failedRep };
    setSets(newSets);
  };

  const addSet = () => {
    setSets([...sets, { completed: false }]);
  };

  const removeSet = () => {
    if (sets.length > 1) {
      setSets(sets.slice(0, -1));
    }
  };

  const handleSubmit = () => {
    // Only count completed sets
    const completedSets = sets.filter(set => set.completed).length;

    if (completedSets === 0) {
      toast({
        title: "No sets completed",
        description: "Please complete at least one set before logging the workout",
        variant: "destructive"
      });
      return;
    }

    // Get failed rep from the last incomplete set if any
    const failedRep = sets.find(set => !set.completed)?.failedRep ?? 0;

    // Use suggestion values if available, otherwise use defaults
    const weight = suggestion?.weight ?? 0;
    const targetReps = suggestion?.reps ?? 1;
    const calculatedOneRM = suggestion?.estimatedOneRM ?? weight;

    // Log the data being sent
    console.log('Submitting workout log:', {
      exercise: exercise.name,
      weight,
      completedSets,
      targetReps,
      failedRep,
      calculatedOneRM,
      exerciseConfig: {
        setsRange: exercise.setsRange,
        repsRange: exercise.repsRange
      }
    });

    logWorkout.mutate({
      exercise: exercise.name,
      weight,
      completedSets,
      targetReps,
      failedRep,
      calculatedOneRM
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{exercise.name}</span>
          {suggestion && (
            <span className="text-sm font-normal">
              Target: {suggestion.sets}×{suggestion.reps} @ {suggestion.weight}kg
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={removeSet} disabled={sets.length <= 1}>
              <Minus className="w-4 h-4" />
              <span className="ml-2">Remove Set</span>
            </Button>
            <Button variant="outline" size="sm" onClick={addSet}>
              <Plus className="w-4 h-4" />
              <span className="ml-2">Add Set</span>
            </Button>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sets.map((set, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant={set.completed ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleSetCompletion(index, true)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Set {index + 1}
                  </Button>
                  <Button
                    variant={!set.completed ? "destructive" : "outline"}
                    onClick={() => handleSetCompletion(index, false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {!set.completed && (
                  <Input
                    type="number"
                    placeholder="Failed at rep"
                    value={set.failedRep || ""}
                    onChange={(e) => handleSetCompletion(index, false, parseInt(e.target.value, 10))}
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={logWorkout.isPending}
          >
            Complete Exercise
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}