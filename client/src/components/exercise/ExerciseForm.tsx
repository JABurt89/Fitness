import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { exerciseSchema, type Exercise, type InsertExercise } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ExerciseFormProps {
  exercise?: Exercise | null;
  onSuccess?: () => void;
}

const STARTING_WEIGHTS = {
  "Barbell": 20,
  "EZ Bar": 12,
  "Dumbbell": 2.5,
  "Smith Machine": 15,
  "Custom": 0
} as const;

type StartingWeightType = keyof typeof STARTING_WEIGHTS;

export default function ExerciseForm({ exercise, onSuccess }: ExerciseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<InsertExercise>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: exercise?.name ?? "",
      bodyPart: exercise?.bodyPart ?? "",
      setsRange: exercise?.setsRange ?? [3, 5],
      repsRange: exercise?.repsRange ?? [8, 12],
      weightIncrement: exercise?.weightIncrement ? Number(exercise.weightIncrement) : 2.5,
      restTimer: exercise?.restTimer ?? 60,
      startingWeightType: (exercise?.startingWeightType as StartingWeightType) ?? "Barbell",
      customStartingWeight: exercise?.customStartingWeight ? Number(exercise.customStartingWeight) : undefined
    },
    mode: "onSubmit"
  });

  console.log("Form mounted with values:", form.getValues());

  const mutation = useMutation({
    mutationFn: async (data: InsertExercise) => {
      console.log('Starting mutation with data:', data);
      setIsSubmitting(true);

      try {
        const formattedData = {
          ...data,
          setsRange: [Number(data.setsRange[0]), Number(data.setsRange[1])],
          repsRange: [Number(data.repsRange[0]), Number(data.repsRange[1])],
          weightIncrement: Number(data.weightIncrement),
          restTimer: Number(data.restTimer),
          customStartingWeight: data.customStartingWeight ? Number(data.customStartingWeight) : undefined
        };

        console.log('Sending formatted data to server:', formattedData);
        const response = await apiRequest('POST', '/api/exercises', formattedData);
        console.log('Server response:', response);
        return response;
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Mutation error handler:', error);
      toast({
        title: "Failed to create exercise",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    },
    onSuccess: (data) => {
      console.log('Exercise created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      toast({ title: "Exercise created successfully" });
      onSuccess?.();
      form.reset();
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    console.log('Form submission handler called with data:', data);

    if (Object.keys(form.formState.errors).length > 0) {
      console.error('Form validation errors:', form.formState.errors);
      toast({
        title: "Validation Error",
        description: "Please fix the form errors before submitting",
        variant: "destructive"
      });
      return;
    }

    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  });

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          console.log('Form submit event triggered');
          handleSubmit(e);
        }} 
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Bench Press" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bodyPart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body Part</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Chest" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="setsRange.0"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Sets</FormLabel>
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
            name="setsRange.1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Sets</FormLabel>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="repsRange.0"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Reps</FormLabel>
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
            name="repsRange.1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Reps</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="weightIncrement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight Increment (kg)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="restTimer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rest Timer (seconds)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startingWeightType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starting Weight Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select starting weight type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.keys(STARTING_WEIGHTS).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type} {type !== "Custom" && `(${STARTING_WEIGHTS[type as StartingWeightType]}kg)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("startingWeightType") === "Custom" && (
          <FormField
            control={form.control}
            name="customStartingWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Starting Weight (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-2">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || mutation.isPending}
          >
            {isSubmitting ? "Creating..." : "Create Exercise"}
          </Button>
        </div>
      </form>
    </Form>
  );
}