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
  exercises: Exercise[];
  nextDayNumber: number;
  onSuccess?: () => void;
}

export default function WorkoutDayForm({ exercises, nextDayNumber, onSuccess }: WorkoutDayFormProps) {
  const { toast } = useToast();
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

  console.log('Form state:', form.formState);
  console.log('Current form values:', form.getValues());

  const createWorkoutDay = useMutation({
    mutationFn: async (data: InsertWorkoutDay) => {
      console.log('Mutation starting with data:', data);
      const response = await apiRequest('POST', '/api/workout-days', data);
      console.log('API Response:', response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create workout day');
      }

      const result = await response.json();
      console.log('API Success result:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ 
        title: "Success",
        description: "Workout day created successfully"
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workout day",
        variant: "destructive"
      });
    },
    onSettled: () => {
      console.log('Mutation settled, resetting submit state');
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
    console.log('Changing progression scheme:', { exerciseName, schemeType });
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
      case "REVERSE_PYRAMID":
        newScheme = {
          type: ProgressionScheme.REVERSE_PYRAMID,
          reversePyramid: {
            topSetWeight: 0,
            topSetReps: 6,
            dropPercentage: 0.10,
            backoffSets: 2
          }
        };
        break;
      case "DOUBLE_PROGRESSION":
        newScheme = {
          type: ProgressionScheme.DOUBLE_PROGRESSION,
          doubleProgression: {
            repRangeMin: 8,
            repRangeMax: 12,
            targetSets: 3,
            currentWeight: 0
          }
        };
        break;
      case "RPT_INDEPENDENT":
        newScheme = {
          type: ProgressionScheme.RPT_INDEPENDENT,
          rptIndependent: {
            topSetRepRange: [6, 8],
            dropPercentage: 0.10,
            backoffSets: [
              { repRange: [8, 10] },
              { repRange: [10, 12] }
            ]
          }
        };
        break;
      default:
        console.error('Unknown progression scheme type:', schemeType);
        return;
    }

    console.log('Setting new progression scheme:', { exerciseName, newScheme });
    form.setValue("progressionSchemes", {
      ...currentSchemes,
      [exerciseName]: newScheme
    }, { shouldValidate: true });
  };

  const onSubmit = async (data: InsertWorkoutDay) => {
    console.log('Form submission started:', data);

    try {
      if (!data.exercises || data.exercises.length === 0) {
        console.log('No exercises selected');
        toast({
          title: "Error",
          description: "Please select at least one exercise",
          variant: "destructive"
        });
        return;
      }

      const missingSchemes = data.exercises.filter(
        exerciseName => !data.progressionSchemes[exerciseName]
      );

      if (missingSchemes.length > 0) {
        console.error('Missing progression schemes for exercises:', missingSchemes);
        toast({
          title: "Error",
          description: `Please select progression schemes for: ${missingSchemes.join(", ")}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Validation passed, submitting data:', data);
      setIsSubmitting(true);
      await createWorkoutDay.mutateAsync(data);
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogTitle>Create Workout Day</DialogTitle>
      <DialogDescription>
        Configure your workout day by selecting exercises and their progression schemes.
      </DialogDescription>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            console.log('Exercise checkbox changed:', { exercise: exercise.name, checked });
                            const current = form.watch("exercises");
                            const updated = checked
                              ? [...current, exercise.name]
                              : current.filter((name) => name !== exercise.name);

                            // Initialize progression scheme when exercise is checked
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
                            onValueChange={(value) => {
                              console.log('Progression scheme changed:', { exercise: exercise.name, value });
                              handleProgressionSchemeChange(exercise.name, value as keyof typeof ProgressionScheme);
                            }}
                            defaultValue="RETARDED_VOLUME"
                            value={form.watch(`progressionSchemes.${exercise.name}.type`) || "RETARDED_VOLUME"}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select progression type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RETARDED_VOLUME">Retarded Volume</SelectItem>
                              <SelectItem value="STRAIGHT_SETS">Straight Sets</SelectItem>
                              <SelectItem value="REVERSE_PYRAMID">Reverse Pyramid</SelectItem>
                              <SelectItem value="DOUBLE_PROGRESSION">Double Progression</SelectItem>
                              <SelectItem value="RPT_INDEPENDENT">RPT Independent</SelectItem>
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
            {isSubmitting ? "Creating..." : "Create Workout Day"}
          </Button>
        </form>
      </Form>
    </>
  );
}