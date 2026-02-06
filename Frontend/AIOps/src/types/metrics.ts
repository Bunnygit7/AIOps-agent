export type Metric = {
  value: number;
  status: "Normal" | "High" | "Critical";
};

export type SystemMetrics = {
  cpu: Metric;
  memory: Metric;
  latency: Metric;
  timestamp: string;
};
