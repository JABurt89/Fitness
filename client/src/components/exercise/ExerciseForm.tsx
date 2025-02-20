import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exerciseSchema, type Exercise } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ExerciseFormProps {
  exercise?: Exercise | null;
  onSuccess?: () => void;
}

export default function ExerciseForm({ exercise, onSuccess }: ExerciseFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise || {
      name: "",
      bodyPart: "",
      setsRange: [3, 5],
      repsRange: [8, 12],
      weightIncrement: 2.5,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form.getValues) => {
      if (exercise) {
        await apiRequest('PATCH', `/api/exercises/${exercise.id}`, data);
      } else {
        await apiRequest('POST', '/api/exercises', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      toast({ title: `Exercise ${exercise ? 'updated' : 'created'} successfully` });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: `Failed to ${exercise ? 'update' : 'create'} exercise`,
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
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
                      onChange={e => field.onChange([parseInt(e.target.value), field.value[1]])}
                    />
                  </FormControl>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value[1]}
                      onChange={e => field.onChange([field.value[0], parseInt(e.target.value)])}
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
                      onChange={e => field.onChange([parseInt(e.target.value), field.value[1]])}
                    />
                  </FormControl>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value[1]}
                      onChange={e => field.onChange([field.value[0], parseInt(e.target.value)])}
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
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {exercise ? 'Update' : 'Create'} Exercise
        </Button>
      </form>
    </Form>
  );
}
