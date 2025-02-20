import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeightLog } from "@shared/schema";
import { weightLogSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function WeightTracker() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(weightLogSchema),
    defaultValues: {
      weight: 0,
      date: new Date(),
    },
  });

  const { data: weightLogs } = useQuery<WeightLog[]>({
    queryKey: ['/api/weight-logs']
  });

  const addWeight = useMutation({
    mutationFn: async (data: { weight: number, date: Date }) => {
      await apiRequest('POST', '/api/weight-logs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weight-logs'] });
      form.reset();
      toast({ title: "Weight logged successfully" });
    },
    onError: () => {
      toast({ title: "Failed to log weight", variant: "destructive" });
    }
  });

  const chartData = weightLogs?.map(log => ({
    date: new Date(log.date).toLocaleDateString(),
    weight: Number(log.weight)
  })) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Weight Tracker</h1>

      <Card>
        <CardHeader>
          <CardTitle>Log Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => addWeight.mutate(data))}
              className="flex gap-4 items-end"
            >
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit">Log Weight</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weight Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
