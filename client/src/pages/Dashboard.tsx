import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Exercise, WorkoutLog, WeightLog } from "@shared/schema";
import { Dumbbell, Calendar, ClipboardList, Scale } from "lucide-react";

export default function Dashboard() {
  const { data: exercises } = useQuery<Exercise[]>({ queryKey: ['/api/exercises'] });
  const { data: workoutLogs } = useQuery<WorkoutLog[]>({ queryKey: ['/api/workout-logs'] });
  const { data: weightLogs } = useQuery<WeightLog[]>({ queryKey: ['/api/weight-logs'] });

  const recentWeightData = weightLogs?.slice(-7).map(log => ({
    date: new Date(log.date).toLocaleDateString(),
    weight: Number(log.weight)
  })) || [];

  const stats = [
    { title: "Total Exercises", value: exercises?.length || 0, icon: Dumbbell },
    { title: "Workouts Logged", value: workoutLogs?.length || 0, icon: ClipboardList },
    { title: "Latest Weight", value: weightLogs?.at(-1)?.weight || 0, icon: Scale },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Weight Progress (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentWeightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
