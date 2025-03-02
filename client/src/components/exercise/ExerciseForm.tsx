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
  onSuccess?: () => void;
}

const STARTING_WEIGHTS = {
  "Barbell": 20,
  "EZ Bar": 12,
  "Dumbbell": 2.5,
  "Smith Machine": 15,
  "Custom": 0
} as const;

export default function ExerciseForm({ onSuccess }: ExerciseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertExercise>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      bodyPart: "",
      setsRange: [3, 5],
      repsRange: [8, 12],
      weightIncrement: 2.5,
      restTimer: 60,
      startingWeightType: "Barbell"
    }
  });

  const createExercise = useMutation({
    mutationFn: async (data: InsertExercise) => {
      return await apiRequest('POST', '/api/exercises', data);
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      toast({ title: "Exercise created successfully" });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to create exercise",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  function onSubmit(data: InsertExercise) {
    createExercise.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select starting weight type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(STARTING_WEIGHTS).map(([type, weight]) => (
                    <SelectItem key={type} value={type}>
                      {type} {type !== "Custom" && `(${weight}kg)`}
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

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Exercise"}
        </Button>
      </form>
    </Form>
  );
}