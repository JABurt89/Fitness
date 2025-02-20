import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import WorkoutLogForm from "@/components/workout/WorkoutLogForm";
import type { WorkoutLog, Exercise, WorkoutDay } from "@shared/schema";

export default function WorkoutLog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);

  const { data: workoutLogs } = useQuery<WorkoutLog[]>({
    queryKey: ['/api/workout-logs']
  });

  const { data: workoutDays } = useQuery<WorkoutDay[]>({
    queryKey: ['/api/workout-days']
  });

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises']
  });

  const groupedLogs = workoutLogs?.reduce((acc, log) => {
    const date = new Date(log.date).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, WorkoutLog[]>) || {};

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
            <WorkoutLogForm
              workoutDays={workoutDays || []}
              exercises={exercises || []}
              onSuccess={() => setIsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedLogs)
          .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
          .map(([date, logs]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-lg">{date}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <h4 className="font-medium">{log.exercise}</h4>
                        <p className="text-sm text-muted-foreground">
                          {log.completedSets} sets × {log.targetReps} reps @ {log.weight}kg
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">1RM: {log.calculatedOneRM}kg</p>
                        {Number(log.failedRep) > 0 && (
                          <p className="text-sm text-destructive">
                            Failed at rep {log.failedRep}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}