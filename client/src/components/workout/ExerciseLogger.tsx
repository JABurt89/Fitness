import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { calculateOneRM } from "@/lib/workoutCalculator";
import type { Exercise } from "@shared/schema";
import { automaticWorkoutLogSchema } from "@shared/schema";
import type { WorkoutSuggestion } from "@/lib/workoutCalculator";
import { Check, X } from "lucide-react";
import ExerciseTimer from "./ExerciseTimer";

interface ExerciseLoggerProps {
  exercise: Exercise;
  suggestion?: WorkoutSuggestion;
  onComplete: () => void;
}

export default function ExerciseLogger({ 
  exercise, 
  suggestion, 
  onComplete,
}: ExerciseLoggerProps) {
  const { toast } = useToast();
  const [sets, setSets] = useState<Array<{ completed: boolean; failedRep?: number }>>([]);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (suggestion?.sets) {
      // Initialize sets array with required sets plus one bonus set
      const initialSets = Array(suggestion.sets + 1).fill({ completed: false });
      setSets(initialSets);
    }
  }, [suggestion?.sets]);

  const logWorkout = useMutation({
    mutationFn: async (data: any) => {
      try {
        const validatedData = automaticWorkoutLogSchema.parse(data);
        return await apiRequest('POST', '/api/workout-logs', validatedData);
      } catch (error) {
        console.error('Validation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Workout logged successfully" });
      onComplete();
    },
    onError: (error) => {
      console.error('Failed to log workout:', error);
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

    if (completed && index < sets.length - 1) { // Don't start timer after bonus set
      setActiveSetIndex(index + 1);
      setIsTimerActive(true);
    }
  };

  const handleTimerComplete = () => {
    setIsTimerActive(false);
    setActiveSetIndex(null);
  };

  const handleSubmit = () => {
    const mainSets = sets.slice(0, -1); // Exclude bonus set from main set count
    const completedMainSets = mainSets.filter(set => set.completed).length;
    const bonusSet = sets[sets.length - 1];

    if (completedMainSets === 0) {
      toast({
        title: "No sets completed",
        description: "Please complete at least one set before logging the workout",
        variant: "destructive"
      });
      return;
    }

    const weight = suggestion?.weight ?? 0;
    const targetReps = suggestion?.reps ?? 0;
    const failedRep = bonusSet.completed ? 0 : bonusSet.failedRep ?? 0;

    const calculatedOneRM = calculateOneRM(
      weight,
      targetReps,
      completedMainSets,
      failedRep
    );

    const workoutData = {
      exercise: exercise.name,
      weight,
      completedSets: completedMainSets,
      targetReps,
      failedRep,
      calculatedOneRM,
      date: new Date().toISOString()
    };

    logWorkout.mutate(workoutData);
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
          {isTimerActive && exercise.restTimer && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Rest Timer - Set {(activeSetIndex ?? 0) + 1}</h3>
              <ExerciseTimer
                duration={exercise.restTimer}
                onComplete={handleTimerComplete}
                autoStart={true}
              />
            </div>
          )}
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
                    {index === sets.length - 1 ? "Bonus Set" : `Set ${index + 1}`}
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
                    placeholder={index === sets.length - 1 ? "Bonus reps" : "Failed at rep"}
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