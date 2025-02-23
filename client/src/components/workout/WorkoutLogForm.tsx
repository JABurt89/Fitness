import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutDay, Exercise } from "@shared/schema";
import { manualWorkoutLogSchema } from "@shared/schema";
import { calculateOneRM } from "@/lib/workoutCalculator";

interface WorkoutLogFormProps {
  workoutDays: WorkoutDay[];
  exercises: Exercise[];
  onSuccess?: () => void;
}

export default function WorkoutLogForm({
  workoutDays,
  exercises,
  onSuccess,
}: WorkoutLogFormProps) {
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const form = useForm({
    resolver: zodResolver(manualWorkoutLogSchema),
    defaultValues: {
      exercise: "",
      completedSets: 1,
      targetReps: 1,
      weight: 0,
      failedRep: 0,
      calculatedOneRM: 0,
      date: new Date(),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Calculate 1RM if not provided
      const oneRM = data.calculatedOneRM || calculateOneRM(
        Number(data.weight),
        Number(data.targetReps),
        Number(data.completedSets),
        Number(data.failedRep)
      );

      const payload = {
        ...data,
        calculatedOneRM: oneRM,
      };

      return await apiRequest('POST', '/api/workout-logs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Workout logged successfully" });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to log workout:', error);
      toast({
        title: "Failed to log workout",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="exercise"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedExercise(exercises.find(e => e.name === value) || null);
                }} 
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an exercise" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((exercise) => (
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

        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={selectedExercise?.weightIncrement || 1}
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
                  min={1}
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
                  min={1}
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
          name="failedRep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Failed at Rep (0 if completed all reps)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
        >
          Log Workout
        </Button>
      </form>
    </Form>
  );
}