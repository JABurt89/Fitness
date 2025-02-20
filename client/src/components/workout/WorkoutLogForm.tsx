import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkoutDay, Exercise } from "@shared/schema";
import { workoutLogSchema } from "@shared/schema";
import ExerciseLogger from "./ExerciseLogger";

interface WorkoutLogFormProps {
  workoutDays: WorkoutDay[];
  exercises: Exercise[];
  onSuccess?: () => void;
  isManualEntry?: boolean;
}

export default function WorkoutLogForm({
  workoutDays,
  exercises,
  onSuccess,
  isManualEntry = false
}: WorkoutLogFormProps) {
  const [logType, setLogType] = useState<"single" | "day">("single");
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);

  console.log('WorkoutLogForm isManualEntry:', isManualEntry, typeof isManualEntry);

  const form = useForm({
    defaultValues: {
      logType: "single",
      workoutDay: "",
      exercise: ""
    }
  });

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
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="logType"
          render={() => (
            <FormItem className="space-y-3">
              <FormLabel>Log Type</FormLabel>
              <FormControl>
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
              </FormControl>
            </FormItem>
          )}
        />

        {logType === "day" && (
          <FormField
            control={form.control}
            name="workoutDay"
            render={() => (
              <FormItem>
                <FormLabel>Select Workout Day</FormLabel>
                <FormControl>
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
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="exercise"
          render={() => (
            <FormItem>
              <FormLabel>Select Exercise</FormLabel>
              <FormControl>
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
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}