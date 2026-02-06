import axios from "axios";
import { SystemMetrics } from "../types/metrics";

const api = axios.create({
  baseURL: "http://localhost:9091",
});

export async function fetchMetrics(): Promise<SystemMetrics> {
  const { data } = await api.get("/metrics");

  return {
    cpu: { value: data[4], status: data[7] },
    memory: { value: data[5], status: data[8] },
    latency: { value: data[6], status: data[9] },
    timestamp: new Date().toISOString(),
  };
}
