import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
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

  const reorderWorkouts = useMutation({
    mutationFn: async (items: WorkoutDay[]) => {
      // Ensure IDs are numbers
      const updates = items.map((workout, index) => ({
        id: Number(workout.id),
        displayOrder: index
      }));

      console.log('Reorder mutation payload:', {
        items,
        updates,
        workoutIds: updates.map(u => u.id),
        originalIds: items.map(i => i.id)
      });

      await apiRequest('PATCH', '/api/workout-days/reorder', {
        workouts: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-days'] });
      toast({ title: "Workout order updated" });
    },
    onError: (error: any) => {
      console.error('Reorder mutation error:', error);
      toast({ 
        title: "Failed to update workout order",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination || !workoutDays) {
      console.log('Invalid drag result:', result);
      return;
    }

    console.log('Drag end result:', {
      source: result.source,
      destination: result.destination,
      workoutDays: workoutDays.map(w => ({ id: w.id, name: w.dayName }))
    });

    const items = Array.from(workoutDays);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    console.log('Reordered items:', {
      items: items.map(i => ({ id: i.id, name: i.dayName })),
      reorderedItem: { id: reorderedItem.id, name: reorderedItem.dayName }
    });

    reorderWorkouts.mutate(items);
  };

  if (loadingDays || loadingExercises) return <div>Loading...</div>;

  const sortedWorkouts = workoutDays?.sort((a, b) => 
    (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  ) ?? [];

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
              nextDayNumber={sortedWorkouts.length + 1}
              onSuccess={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="workouts">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {sortedWorkouts.map((day, index) => (
                <Draggable
                  key={day.id}
                  draggableId={String(day.id)}
                  index={index}
                >
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Day #{index + 1}</div>
                              <h3 className="text-lg font-semibold">{day.dayName}</h3>
                            </div>
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
                          {day.exercises.join(", ")}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}