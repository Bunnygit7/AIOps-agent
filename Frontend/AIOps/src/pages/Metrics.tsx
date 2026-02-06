import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "../api/metricsApi";

export default function Metrics() {
  const { data } = useQuery({
    queryKey: ["metrics-history"],
    queryFn: fetchMetrics,
    refetchInterval: 5000,
  });

  if (!data) return null;

  const chartData = [{
    time: new Date(data.timestamp).toLocaleTimeString(),
    cpu: data.cpu.value,
    memory: data.memory.value,
    latency: data.latency.value,
  }];

  return (
    <>
      <h2>Metrics Trends</h2>
      <LineChart width={800} height={300} data={chartData}>
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line dataKey="cpu" stroke="#1976d2" />
        <Line dataKey="memory" stroke="#2e7d32" />
        <Line dataKey="latency" stroke="#d32f2f" />
      </LineChart>
    </>
  );
}
