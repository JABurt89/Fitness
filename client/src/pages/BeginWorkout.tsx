import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { WorkoutDay } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function BeginWorkout() {
  const { toast } = useToast();

  const { data: workoutDays, isLoading } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout-days'],
  });

  const reorderWorkouts = useMutation({
    mutationFn: async (updates: { id: number; displayOrder: number }[]) => {
      return await apiRequest('PATCH', '/api/workout-days/reorder', {
        workouts: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout order updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update workout order",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive" 
      });
    }
  });

  const moveWorkout = (workoutId: number, direction: 'up' | 'down') => {
    if (!workoutDays) return;

    const sortedWorkouts = [...workoutDays].sort((a, b) => 
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    );

    const currentIndex = sortedWorkouts.findIndex(w => w.id === workoutId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedWorkouts.length) return;

    // Swap the display orders
    const updates = [
      { id: sortedWorkouts[currentIndex].id, displayOrder: newIndex },
      { id: sortedWorkouts[newIndex].id, displayOrder: currentIndex }
    ];

    reorderWorkouts.mutate(updates);
  };

  if (isLoading) {
    return <div>Loading workouts...</div>;
  }

  const sortedWorkouts = workoutDays?.sort((a, b) => 
    (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  ) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Begin Workout</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Workout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedWorkouts.map((workout, index) => (
              <div key={workout.id} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveWorkout(workout.id, 'up')}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === sortedWorkouts.length - 1}
                    onClick={() => moveWorkout(workout.id, 'down')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    // TODO: Implement workout selection
                  }}
                >
                  <span>{workout.dayName}</span>
                  <span className="text-muted-foreground">
                    {workout.lastCompleted
                      ? new Date(workout.lastCompleted).toLocaleDateString()
                      : 'Never completed'}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}