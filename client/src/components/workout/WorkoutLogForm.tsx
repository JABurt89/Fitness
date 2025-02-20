import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutDay, Exercise, InsertWorkoutLog } from "@shared/schema";
import { workoutLogSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import ExerciseLogger from "./ExerciseLogger"; //Import ExerciseLogger

interface WorkoutLogFormProps {
  workoutDays: WorkoutDay[];
  exercises: Exercise[];
  onSuccess?: () => void;
  isManualEntry?: boolean;
}

// Ported from CLI implementation
function calculateOneRM(weight: number, targetReps: number, completedSets: number, failedRep: number = 0): number {
  const C = weight * (1 + 0.025 * targetReps) * (1 + 0.025 * (completedSets - 1));
  if (failedRep > 0) {
    const F = weight * (1 + 0.025 * targetReps) * (1 + 0.025 * completedSets);
    return C + ((failedRep / targetReps) * (F - C));
  }
  return C;
}

export default function WorkoutLogForm({
  workoutDays,
  exercises,
  onSuccess,
  isManualEntry = false
}: WorkoutLogFormProps) {
  const { toast } = useToast();
  const [logType, setLogType] = useState<"single" | "day">("single");
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);

  console.log('WorkoutLogForm isManualEntry:', isManualEntry, typeof isManualEntry);

  if (currentExercise) {
    return (
      <ExerciseLogger
        exercise={currentExercise}
        onComplete={() => {
          setCurrentExercise(null);
          onSuccess?.();
        }}
        isManualEntry={isManualEntry}
      />
    );
  }

  const availableExercises = logType === "day" && selectedDay
    ? exercises.filter(ex => selectedDay.exercises.includes(ex.name))
    : exercises;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <FormItem className="space-y-3">
          <FormLabel>Log Type</FormLabel>
          <RadioGroup
            defaultValue="single"
            onValueChange={(value: "single" | "day") => setLogType(value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <label htmlFor="single">Single Exercise</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="day" id="day" />
              <label htmlFor="day">Workout Day</label>
            </div>
          </RadioGroup>
        </FormItem>

        {logType === "day" && (
          <FormItem>
            <FormLabel>Select Workout Day</FormLabel>
            <Select
              onValueChange={(value) => {
                const day = workoutDays.find(d => d.id === parseInt(value));
                setSelectedDay(day || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a workout day" />
              </SelectTrigger>
              <SelectContent>
                {workoutDays.map((day) => (
                  <SelectItem key={day.id} value={day.id.toString()}>
                    {day.dayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}

        <FormItem>
          <FormLabel>Select Exercise</FormLabel>
          <Select
            onValueChange={(value) => {
              const exercise = exercises.find(ex => ex.name === value);
              if (exercise) {
                setCurrentExercise(exercise);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an exercise" />
            </SelectTrigger>
            <SelectContent>
              {availableExercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.name}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      </div>
    </div>
  );
}