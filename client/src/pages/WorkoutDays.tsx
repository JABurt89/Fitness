import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WorkoutDayForm from "@/components/workout/WorkoutDayForm";
import type { WorkoutDay, Exercise } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableWorkoutDayProps {
  day: WorkoutDay;
  index: number;
  onEdit: (day: WorkoutDay) => void;
  onDelete: (id: number) => void;
}

function SortableWorkoutDay({ day, index, onEdit, onDelete }: SortableWorkoutDayProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: day.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="cursor-grab">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners}>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                onClick={() => onEdit(day)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(day.id)}
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
    </div>
  );
}

export default function WorkoutDays() {
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !workoutDays) return;

    if (active.id !== over.id) {
      const oldIndex = workoutDays.findIndex((day) => day.id === active.id);
      const newIndex = workoutDays.findIndex((day) => day.id === over.id);

      const newOrder = arrayMove(workoutDays, oldIndex, newIndex);
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        displayOrder: index
      }));

      reorderWorkouts.mutate(updates);
    }
  };

  if (loadingDays || loadingExercises) {
    return <div>Loading...</div>;
  }

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
            <DialogHeader>
              <DialogTitle>
                {selectedDay ? 'Edit Workout Day' : 'Create New Workout Day'}
              </DialogTitle>
              <DialogDescription>
                Configure your workout day by selecting exercises and their progression schemes.
              </DialogDescription>
              <WorkoutDayForm
                workoutDay={selectedDay}
                exercises={exercises || []}
                nextDayNumber={sortedWorkouts.length + 1}
                onSuccess={() => {
                  setIsOpen(false);
                  setSelectedDay(null);
                }}
              />
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4">
          <SortableContext
            items={sortedWorkouts.map(day => day.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedWorkouts.map((day, index) => (
              <SortableWorkoutDay
                key={day.id}
                day={day}
                index={index}
                onEdit={(day) => {
                  setSelectedDay(day);
                  setIsOpen(true);
                }}
                onDelete={(id) => deleteWorkoutDay.mutate(id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}