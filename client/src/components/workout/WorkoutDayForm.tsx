import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { workoutDaySchema, type Exercise, type InsertWorkoutDay } from "@shared/schema";
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

  const form = useForm<InsertWorkoutDay>({
    resolver: zodResolver(workoutDaySchema),
    defaultValues: {
      dayName: `Day ${nextDayNumber}`,
      exercises: [],
      displayOrder: nextDayNumber - 1,
      progressionSchemes: {}
    }
  });

  const createWorkoutDay = useMutation({
    mutationFn: async (data: InsertWorkoutDay) => {
      return await apiRequest('POST', '/api/workout-days', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ 
        title: "Success",
        description: "Workout day created successfully" 
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
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

  const onSubmit = form.handleSubmit((data) => {
    setIsSubmitting(true);

    // Extra validation for exercise selection
    if (!data.exercises || data.exercises.length === 0) {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Please select at least one exercise",
        variant: "destructive"
      });
      return;
    }

    createWorkoutDay.mutate(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Day #{nextDayNumber}
        </div>

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
                        const updated = checked
                          ? [...current, exercise.name]
                          : current.filter((name) => name !== exercise.name);
                        form.setValue("exercises", updated, {
                          shouldValidate: true,
                          shouldDirty: true
                        });
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