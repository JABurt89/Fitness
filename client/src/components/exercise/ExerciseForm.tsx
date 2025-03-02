import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
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

  console.log('ExerciseForm mounting with props:', { exercise, hasOnSuccess: !!onSuccess });

  const form = useForm<InsertExercise>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise ? {
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      setsRange: exercise.setsRange,
      repsRange: exercise.repsRange,
      weightIncrement: Number(exercise.weightIncrement),
      restTimer: exercise.restTimer,
      startingWeightType: exercise.startingWeightType as StartingWeightType,
      customStartingWeight: exercise.customStartingWeight ? Number(exercise.customStartingWeight) : undefined
    } : {
      name: "",
      bodyPart: "",
      setsRange: [3, 5],
      repsRange: [8, 12],
      weightIncrement: 2.5,
      restTimer: 60,
      startingWeightType: "Barbell",
      customStartingWeight: undefined
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertExercise) => {
      console.log('Exercise mutation starting with data:', data);
      setIsSubmitting(true);
      try {
        const response = await apiRequest('POST', '/api/exercises', data);
        console.log('Exercise mutation response:', response);
        return response;
      } catch (error) {
        console.error('Exercise mutation failed:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      console.log('Exercise mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      toast({ title: `Exercise ${exercise ? 'updated' : 'created'} successfully` });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Exercise mutation error:', error);
      toast({
        title: `Failed to ${exercise ? 'update' : 'create'} exercise`,
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertExercise) => {
    console.log('Form submission starting with values:', {
      formData: data,
      formState: form.formState
    });

    if (Object.keys(form.formState.errors).length > 0) {
      console.error('Form validation errors:', form.formState.errors);
      return;
    }

    mutation.mutate(data);
  };

  const startingWeightType = form.watch("startingWeightType") as StartingWeightType;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="setsRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sets Range (min-max)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value[0]}
                      onChange={e => field.onChange([Number(e.target.value), field.value[1]])}
                    />
                  </FormControl>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value[1]}
                      onChange={e => field.onChange([field.value[0], Number(e.target.value)])}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repsRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reps Range (min-max)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value[0]}
                      onChange={e => field.onChange([Number(e.target.value), field.value[1]])}
                    />
                  </FormControl>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value[1]}
                      onChange={e => field.onChange([field.value[0], Number(e.target.value)])}
                    />
                  </FormControl>
                </div>
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
              <Select onValueChange={field.onChange} value={field.value}>
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

        {startingWeightType === "Custom" && (
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
          disabled={isSubmitting || mutation.isPending}
        >
          {exercise ? 'Update' : 'Create'} Exercise
        </Button>
      </form>
    </Form>
  );
}