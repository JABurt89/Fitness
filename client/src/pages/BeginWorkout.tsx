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
      console.log('Original reordered workouts:', {
        workouts: reorderedWorkouts,
        firstId: reorderedWorkouts[0]?.id,
        firstIdType: reorderedWorkouts[0]?.id ? typeof reorderedWorkouts[0].id : 'undefined'
      });

      // Create the updates array with explicit number conversion
      const updates = reorderedWorkouts.map((workout, index) => ({
        id: Number(workout.id),
        displayOrder: index
      }));

      console.log('Sending update payload:', {
        updates,
        firstUpdateId: updates[0]?.id,
        firstUpdateIdType: updates[0]?.id ? typeof updates[0].id : 'undefined'
      });

      try {
        await apiRequest('PATCH', '/api/workout-days/reorder', {
          workouts: updates
        });
      } catch (error) {
        console.error('Mutation apiRequest error:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error; // Re-throw to trigger onError handler
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout order updated" });
    },
    onError: (error: any) => {
      console.error('Reorder mutation error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({ 
        title: "Failed to update workout order",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive" 
      });
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination || !workoutDays) {
      return;
    }

    // Log the original workoutDays array
    console.log('Original workoutDays:', {
      workouts: workoutDays,
      firstId: workoutDays[0]?.id,
      firstIdType: workoutDays[0]?.id ? typeof workoutDays[0].id : 'undefined'
    });

    const items = Array.from(workoutDays);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Log the reordered items before mutation
    console.log('After reordering:', {
      items,
      firstId: items[0]?.id,
      firstIdType: items[0]?.id ? typeof items[0].id : 'undefined'
    });

    reorderWorkouts.mutate(items);
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
                      draggableId={String(workout.id)}
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