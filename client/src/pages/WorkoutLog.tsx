import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import WorkoutLogForm from "@/components/workout/WorkoutLogForm";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutLog, Exercise, WorkoutDay } from "@shared/schema";

export default function WorkoutLog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const { toast } = useToast();

  const { data: workoutLogs } = useQuery<WorkoutLog[]>({
    queryKey: ['/api/workout-logs']
  });

  const { data: workoutDays } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout-days']
  });

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises']
  });

  const deleteLog = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/workout-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workout-logs'] });
      toast({ title: "Workout log deleted" });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete workout log", 
        variant: "destructive" 
      });
    }
  });

  const groupedLogs = workoutLogs?.reduce((acc, log) => {
    const date = new Date(log.date).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, WorkoutLog[]>) || {};

  // Get dates sorted in reverse chronological order
  const sortedDates = Object.keys(groupedLogs)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Limit dates if not showing all logs
  const displayDates = showAllLogs 
    ? sortedDates 
    : sortedDates.slice(0, 10);

  const hasMoreLogs = sortedDates.length > 10;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout Log</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedDay(null)}>
              <Plus className="mr-2 h-4 w-4" /> Log Workout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Workout</DialogTitle>
            </DialogHeader>
            <WorkoutLogForm
              workoutDays={workoutDays || []}
              exercises={exercises || []}
              onSuccess={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {displayDates.map((date) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-lg">{date}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupedLogs[date]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log) => (
                    <div key={log.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <h4 className="font-medium">{log.exercise}</h4>
                        <p className="text-sm text-muted-foreground">
                          {log.completedSets} sets × {log.targetReps} reps @ {log.weight}kg
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">1RM: {log.calculatedOneRM}kg</p>
                          {Number(log.failedRep) > 0 && (
                            <p className="text-sm text-destructive">
                              Failed at rep {log.failedRep}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLog.mutate(log.id)}
                          disabled={deleteLog.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {!showAllLogs && hasMoreLogs && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowAllLogs(true)}
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            Show More Logs
          </Button>
        )}
      </div>
    </div>
  );
}