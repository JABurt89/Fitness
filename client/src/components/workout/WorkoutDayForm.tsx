import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { workoutDaySchema, type Exercise, type WorkoutDay, type InsertWorkoutDay } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface WorkoutDayFormProps {
  exercises: Exercise[];
  nextDayNumber: number;
  onSuccess?: () => void;
}

export default function WorkoutDayForm({
  exercises,
  nextDayNumber,
  onSuccess,
}: WorkoutDayFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<InsertWorkoutDay>({
    resolver: zodResolver(workoutDaySchema),
    defaultValues: {
      dayName: `Day ${nextDayNumber}`,
      exercises: [],
      displayOrder: nextDayNumber - 1,
      progressionSchemes: {}
    }
  });

  // Mutation for creating workout day
  const createWorkoutDay = useMutation({
    mutationFn: async (data: InsertWorkoutDay) => {
      console.log('Submitting workout day data:', data);
      return await apiRequest('POST', '/api/workout-days', data);
    },
    onMutate: () => {
      console.log('Starting workout day creation...');
      setIsSubmitting(true);
    },
    onSuccess: () => {
      console.log('Workout day created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ 
        title: "Success",
        description: "Workout day created successfully"
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Workout day creation failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create workout day",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Form submission handler
  const onSubmit = form.handleSubmit((data) => {
    console.log('Form submission started with data:', data);

    // Validate exercises selection
    const selectedExercises = form.getValues("exercises");
    if (!selectedExercises || selectedExercises.length === 0) {
      console.log('No exercises selected');
      toast({
        title: "Validation Error",
        description: "Please select at least one exercise",
        variant: "destructive"
      });
      return;
    }

    // Submit form data
    try {
      createWorkoutDay.mutate(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="dayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Push Day, Legs Day" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exercises"
          render={() => (
            <FormItem>
              <FormLabel>Exercises</FormLabel>
              <div className="space-y-2">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={form.watch("exercises").includes(exercise.name)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("exercises");
                        if (checked) {
                          form.setValue("exercises", [...current, exercise.name]);
                        } else {
                          form.setValue(
                            "exercises",
                            current.filter((name) => name !== exercise.name)
                          );
                        }
                      }}
                    />
                    <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {exercise.name}
                    </label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Workout Day"}
        </Button>
      </form>
    </Form>
  );
}