import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExerciseForm from "@/components/exercise/ExerciseForm";
import type { Exercise } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Exercises() {
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: exercises, isLoading } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises']
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      toast({ title: "Exercise deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete exercise", variant: "destructive" });
    }
  });

  if (isLoading) return <div>Loading exercises...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exercises</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedExercise(null)}>
              <Plus className="mr-2 h-4 w-4" /> Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <ExerciseForm
              exercise={selectedExercise}
              onSuccess={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exercises?.map((exercise) => (
          <Card key={exercise.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{exercise.name}</h3>
                  <p className="text-sm text-muted-foreground">{exercise.bodyPart}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedExercise(exercise);
                      setIsOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteExercise.mutate(exercise.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p>Sets: {exercise.setsRange.join('-')}</p>
                <p>Reps: {exercise.repsRange.join('-')}</p>
                <p>Weight Increment: {exercise.weightIncrement}kg</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
