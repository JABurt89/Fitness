import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Minus, Calculator } from "lucide-react";
import type { Exercise, WorkoutLog } from "@shared/schema";
import {
  generateWorkoutSuggestions,
  calculateOneRMTrend,
  type WorkoutSuggestion,
} from "@/lib/workoutCalculator";

export default function FutureWorkout() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [customOneRM, setCustomOneRM] = useState<string>("");
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [trend, setTrend] = useState<"up" | "down" | "stable" | null>(null);

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
  });

  const { data: workoutLogs } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/workout-logs"],
  });

  const generateSuggestions = () => {
    if (!selectedExercise) return;

    console.log('Selected exercise:', selectedExercise);

    const exerciseLogs = workoutLogs
      ?.filter((log) => log.exercise === selectedExercise.name)
      .slice(-5)
      .map(log => ({
        ...log,
        calculatedOneRM: Number(log.calculatedOneRM)
      }));

    if (!exerciseLogs?.length && !customOneRM) {
      return;
    }

    let currentOneRM: number;

    if (customOneRM) {
      currentOneRM = parseFloat(customOneRM);
    } else if (exerciseLogs) {
      const { trend: oneRMTrend, nextOneRM } = calculateOneRMTrend(exerciseLogs);
      setTrend(oneRMTrend);
      currentOneRM = nextOneRM;
    } else {
      return;
    }

    const exerciseForCalculation = {
      setsRange: selectedExercise.setsRange,
      repsRange: selectedExercise.repsRange,
      weightIncrement: Number(selectedExercise.weightIncrement),
      startingWeightType: selectedExercise.startingWeightType,
      customStartingWeight: selectedExercise.customStartingWeight
    };

    console.log('Exercise for calculation:', exerciseForCalculation);

    const newSuggestions = generateWorkoutSuggestions(currentOneRM, exerciseForCalculation);
    console.log('Generated suggestions:', newSuggestions);
    setSuggestions(newSuggestions);
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUp className="text-green-500" />;
      case "down":
        return <ArrowDown className="text-red-500" />;
      case "stable":
        return <Minus className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTrendMessage = () => {
    switch (trend) {
      case "up":
        return "Your 1RM is trending upward. Keep up the good work!";
      case "down":
        return "Your 1RM is trending downward. Consider adjusting your training.";
      case "stable":
        return "Your 1RM is stable.";
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Future Workout Calculator</h1>

      <Card>
        <CardHeader>
          <CardTitle>Calculate Your Next Workout</CardTitle>
          <CardDescription>
            Select an exercise to get personalized workout suggestions based on your
            progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Exercise</label>
            <Select
              onValueChange={(value) => {
                const exercise = exercises?.find((e) => e.name === value);
                setSelectedExercise(exercise || null);
                setSuggestions([]);
                setTrend(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises?.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.name}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Custom 1RM (optional)
            </label>
            <Input
              type="number"
              placeholder="Enter your current 1RM"
              value={customOneRM}
              onChange={(e) => setCustomOneRM(e.target.value)}
            />
          </div>

          <Button
            onClick={generateSuggestions}
            disabled={!selectedExercise}
            className="w-full"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Generate Suggestions
          </Button>
        </CardContent>
      </Card>

      {trend && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon()}
              <p className="text-sm">{getTrendMessage()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Workout Suggestions</CardTitle>
            <CardDescription>
              Here are your recommended workout combinations for progressive
              overload:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Sets</th>
                    <th className="p-2 text-left font-medium">Reps</th>
                    <th className="p-2 text-left font-medium">Weight (kg)</th>
                    <th className="p-2 text-left font-medium">Est. 1RM (kg)</th>
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
                      <td className="p-2">{suggestion.weight.toFixed(1)}</td>
                      <td className="p-2">
                        {suggestion.estimatedOneRM.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}