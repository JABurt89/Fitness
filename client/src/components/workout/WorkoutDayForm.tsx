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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Exercise, WorkoutDay, InsertWorkoutDay } from "@shared/schema";
import { workoutDaySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface WorkoutDayFormProps {
  workoutDay?: WorkoutDay | null;
  exercises: Exercise[];
  nextDayNumber: number;
  onSuccess?: () => void;
}

export default function WorkoutDayForm({
  workoutDay,
  exercises,
  nextDayNumber,
  onSuccess,
}: WorkoutDayFormProps) {
  const { toast } = useToast();
  const form = useForm<InsertWorkoutDay>({
    resolver: zodResolver(workoutDaySchema),
    defaultValues: workoutDay || {
      dayName: `Day #${nextDayNumber}`,
      exercises: [],
      displayOrder: nextDayNumber - 1,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertWorkoutDay) => {
      if (workoutDay) {
        await apiRequest('PATCH', `/api/workout-days/${workoutDay.id}`, data);
      } else {
        await apiRequest('POST', '/api/workout-days', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: `Workout day ${workoutDay ? 'updated' : 'created'} successfully` });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: `Failed to ${workoutDay ? 'update' : 'create'} workout day`,
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="dayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day Name</FormLabel>
              <FormControl>
                <Input {...field} readOnly />
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

        <Button type="submit" className="w-full">
          {workoutDay ? 'Update' : 'Create'} Workout Day
        </Button>
      </form>
    </Form>
  );
}