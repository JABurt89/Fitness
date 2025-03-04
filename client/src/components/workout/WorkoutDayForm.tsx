import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  workoutDaySchema, 
  type Exercise, 
  type InsertWorkoutDay,
  ProgressionScheme,
  type ProgressionSettings
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WorkoutDayFormProps {
  workoutDay: {
    id: number;
    userId: number;
    dayName: string;
    exercises: string[];
    displayOrder: number;
    lastCompleted: Date | null;
    progressionSchemes: Record<string, ProgressionSettings>;
  } | null;
  exercises: Exercise[];
  nextDayNumber: number;
  onSuccess?: () => void;
}

export default function WorkoutDayForm({ exercises, nextDayNumber, onSuccess, workoutDay }: WorkoutDayFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertWorkoutDay>({
    resolver: zodResolver(workoutDaySchema),
    defaultValues: workoutDay ? {
      dayName: workoutDay.dayName,
      exercises: workoutDay.exercises,
      displayOrder: workoutDay.displayOrder,
      progressionSchemes: workoutDay.progressionSchemes
    } : {
      dayName: `Day ${nextDayNumber}`,
      exercises: [],
      displayOrder: nextDayNumber - 1,
      progressionSchemes: {}
    }
  });

  const createWorkoutDay = useMutation({
    mutationFn: async (data: InsertWorkoutDay) => {
      console.log('Starting mutation with data:', data);
      const response = await apiRequest(
        workoutDay ? 'PATCH' : 'POST',
        workoutDay ? `/api/workout-days/${workoutDay.id}` : '/api/workout-days',
        data
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create workout day');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ 
        title: "Success",
        description: `Workout day ${workoutDay ? 'updated' : 'created'} successfully`
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${workoutDay ? 'update' : 'create'} workout day`,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const getDefaultProgressionScheme = (): ProgressionSettings => ({
    type: ProgressionScheme.RETARDED_VOLUME,
    retardedVolume: {
      baseWeight: 0,
      targetSets: 4,
      setVariations: [
        { reps: 8, weightMultiplier: 1.0 },
        { reps: 10, weightMultiplier: 0.9 },
        { reps: 12, weightMultiplier: 0.85 },
        { reps: 15, weightMultiplier: 0.8, isOptional: true }
      ],
      failureHandling: {
        minRepsBeforeFailure: 6,
        deloadPercentage: 0.10
      }
    }
  });

  const handleProgressionSchemeChange = (exerciseName: string, schemeType: keyof typeof ProgressionScheme) => {
    const currentSchemes = form.getValues("progressionSchemes") || {};
    let newScheme: ProgressionSettings;

    switch (schemeType) {
      case "RETARDED_VOLUME":
        newScheme = getDefaultProgressionScheme();
        break;
      case "STRAIGHT_SETS":
        newScheme = {
          type: ProgressionScheme.STRAIGHT_SETS,
          straightSets: {
            targetSets: 3,
            targetReps: 8,
            weight: 0
          }
        };
        break;
      default:
        console.error('Unknown progression scheme type:', schemeType);
        return;
    }

    form.setValue("progressionSchemes", {
      ...currentSchemes,
      [exerciseName]: newScheme
    }, { shouldValidate: true });
  };

  const handleSubmit = async (data: InsertWorkoutDay) => {
    console.log('Form submission triggered with data:', data);

    try {
      // Validate exercises are selected
      if (!data.exercises || data.exercises.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one exercise",
          variant: "destructive"
        });
        return;
      }

      // Validate progression schemes
      const missingSchemes = data.exercises.filter(
        exerciseName => !data.progressionSchemes[exerciseName]
      );

      if (missingSchemes.length > 0) {
        toast({
          title: "Error",
          description: `Please select progression schemes for: ${missingSchemes.join(", ")}`,
          variant: "destructive"
        });
        return;
      }

      // Submit form
      setIsSubmitting(true);
      await createWorkoutDay.mutateAsync(data);
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogTitle>{workoutDay ? 'Edit' : 'Create'} Workout Day</DialogTitle>
      <DialogDescription>
        Configure your workout day by selecting exercises and their progression schemes.
      </DialogDescription>

      <Form {...form}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            console.log('Form submit event triggered');
            form.handleSubmit(handleSubmit)(e);
          }} 
          className="space-y-6"
        >
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
                <div className="space-y-4">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch("exercises").includes(exercise.name)}
                          onCheckedChange={(checked) => {
                            const current = form.watch("exercises");
                            const updated = checked
                              ? [...current, exercise.name]
                              : current.filter((name) => name !== exercise.name);

                            if (checked) {
                              console.log('Initializing progression scheme for:', exercise.name);
                              const currentSchemes = form.getValues("progressionSchemes");
                              form.setValue("progressionSchemes", {
                                ...currentSchemes,
                                [exercise.name]: getDefaultProgressionScheme()
                              }, { shouldValidate: true });
                            }

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

                      {form.watch("exercises").includes(exercise.name) && (
                        <div className="ml-6">
                          <FormLabel className="text-xs">Progression Scheme</FormLabel>
                          <Select
                            defaultValue="RETARDED_VOLUME"
                            value={form.watch(`progressionSchemes.${exercise.name}.type`) || "RETARDED_VOLUME"}
                            onValueChange={(value) => handleProgressionSchemeChange(exercise.name, value as keyof typeof ProgressionScheme)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select progression type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RETARDED_VOLUME">Retarded Volume</SelectItem>
                              <SelectItem value="STRAIGHT_SETS">Straight Sets</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating..." : `${workoutDay ? 'Update' : 'Create'} Workout Day`}
          </Button>
        </form>
      </Form>
    </>
  );
}