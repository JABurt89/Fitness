import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    mutationFn: async (reorderedWorkouts: WorkoutDay[]) => {
      await apiRequest('PATCH', '/api/workout-days/reorder', { workouts: reorderedWorkouts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout order updated" });
    },
    onError: () => {
      toast({ title: "Failed to update workout order", variant: "destructive" });
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination || !workoutDays) return;

    const items = Array.from(workoutDays);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the display order for each workout
    const updatedWorkouts = items.map((workout, index) => ({
      ...workout,
      displayOrder: index,
    }));

    reorderWorkouts.mutate(updatedWorkouts);
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="workouts">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {sortedWorkouts.map((workout, index) => (
                    <Draggable
                      key={workout.id}
                      draggableId={workout.id.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
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
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
}
