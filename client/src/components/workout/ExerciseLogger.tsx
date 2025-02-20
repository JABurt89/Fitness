import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Exercise, WorkoutLog } from "@shared/schema";
import type { WorkoutSuggestion } from "@/lib/workoutCalculator";
import { Check, X } from "lucide-react";

interface ExerciseLoggerProps {
  exercise: Exercise;
  suggestion: WorkoutSuggestion;
  onComplete: () => void;
}

export default function ExerciseLogger({ exercise, suggestion, onComplete }: ExerciseLoggerProps) {
  const { toast } = useToast();
  const [sets, setSets] = useState<Array<{ completed: boolean; failedRep?: number }>>([]);

  // Initialize sets based on suggestion
  useEffect(() => {
    // Add one extra set for "Extra reps"
    setSets(Array(suggestion.sets + 1).fill({ completed: false }));
  }, [suggestion.sets]);

  const logWorkout = useMutation({
    mutationFn: async (log: Omit<WorkoutLog, "id" | "date">) => {
      // Convert numeric fields to strings as expected by the schema
      return await apiRequest('POST', '/api/workout-logs', {
        ...log,
        completedSets: String(log.completedSets),
        targetReps: String(log.targetReps),
        weight: String(log.weight),
        failedRep: String(log.failedRep),
        calculatedOneRM: String(log.calculatedOneRM)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Workout logged successfully" });
      onComplete();
    },
    onError: () => {
      toast({ title: "Failed to log workout", variant: "destructive" });
    }
  });

  const handleSetCompletion = (index: number, completed: boolean, failedRep?: number) => {
    const newSets = [...sets];
    newSets[index] = { completed, failedRep };
    setSets(newSets);
  };

  const handleSubmit = () => {
    // Only count completed sets up to the target number (excluding extra set)
    const completedSets = sets
      .slice(0, suggestion.sets)
      .filter(set => set.completed)
      .length;

    // Check the extra set for failed rep
    const extraSet = sets[sets.length - 1];
    const failedRep = extraSet.failedRep ?? 0;

    logWorkout.mutate({
      exercise: exercise.name,
      weight: suggestion.weight,
      completedSets,
      targetReps: suggestion.reps,
      failedRep,
      calculatedOneRM: suggestion.estimatedOneRM
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{exercise.name}</span>
          <span className="text-sm font-normal">
            Target: {suggestion.sets}×{suggestion.reps} @ {suggestion.weight}kg
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
                    {index === sets.length - 1 ? "Extra" : `Set ${index + 1}`}
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