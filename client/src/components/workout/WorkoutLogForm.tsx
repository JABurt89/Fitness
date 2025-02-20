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

interface WorkoutLogFormProps {
  workoutDays: WorkoutDay[];
  exercises: Exercise[];
  onSuccess?: () => void;
  isManualEntry?: boolean;  // Add isManualEntry to props
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
  isManualEntry = false  // Add prop with default
}: WorkoutLogFormProps) {
  const { toast } = useToast();
  const [logType, setLogType] = useState<"single" | "day">("single");
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [failedSet, setFailedSet] = useState(false);

  const form = useForm<InsertWorkoutLog>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: {
      exercise: "",
      completedSets: 3,
      targetReps: 8,
      weight: 0,
      failedRep: 0,
      calculatedOneRM: 0,
      date: new Date(),
      isManualEntry  // Add isManualEntry to form data
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertWorkoutLog) => {
      const oneRM = calculateOneRM(
        Number(data.weight),
        Number(data.targetReps),
        Number(data.completedSets),
        Number(data.failedRep)
      );
      await apiRequest('POST', '/api/workout-logs', {
        ...data,
        calculatedOneRM: oneRM,
        isManualEntry  // Ensure isManualEntry is included in request
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Workout logged successfully" });
      form.reset();
      setFailedSet(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Failed to log workout",
        variant: "destructive",
      });
    },
  });

  const availableExercises = logType === "day" && selectedDay
    ? exercises.filter(ex => selectedDay.exercises.includes(ex.name))
    : exercises;

  const selectedExercise = exercises.find(
    ex => ex.name === form.watch("exercise")
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
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
                if (day?.exercises[0]) {
                  form.setValue("exercise", day.exercises[0]);
                }
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

        <FormField
          control={form.control}
          name="exercise"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedExercise && (
          <>
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={selectedExercise.weightIncrement}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="completedSets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completed Sets</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={selectedExercise.setsRange[0]}
                      max={selectedExercise.setsRange[1]}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetReps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Reps</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={selectedExercise.repsRange[0]}
                      max={selectedExercise.repsRange[1]}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2">
              <Switch
                checked={failedSet}
                onCheckedChange={setFailedSet}
                id="failed-set"
              />
              <label htmlFor="failed-set">Failed on last set?</label>
            </div>

            {failedSet && (
              <FormField
                control={form.control}
                name="failedRep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failed at Rep</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={form.watch("targetReps")}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!selectedExercise || mutation.isPending}
        >
          Log Workout
        </Button>
      </form>
    </Form>
  );
}