import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WorkoutDayForm from "@/components/workout/WorkoutDayForm";
import type { WorkoutDay, Exercise } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function WorkoutDays() {
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: workoutDays, isLoading: loadingDays } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout-days']
  });

  const { data: exercises, isLoading: loadingExercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises']
  });

  const deleteWorkoutDay = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/workout-days/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout day deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete workout day", variant: "destructive" });
    }
  });

  if (loadingDays || loadingExercises) return <div>Loading...</div>;

  const getExerciseNames = (exerciseIds: string[]) => {
    return exerciseIds
      .map(id => exercises?.find(e => e.name === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout Days</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedDay(null)}>
              <Plus className="mr-2 h-4 w-4" /> Add Workout Day
            </Button>
          </DialogTrigger>
          <DialogContent>
            <WorkoutDayForm
              workoutDay={selectedDay}
              exercises={exercises || []}
              onSuccess={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workoutDays?.map((day) => (
          <Card key={day.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{day.dayName}</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedDay(day);
                      setIsOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWorkoutDay.mutate(day.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {getExerciseNames(day.exercises)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
