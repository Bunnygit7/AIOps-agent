import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Stack,
  Select,
  MenuItem,
  TextField,
  Divider,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import MetricCard from "./components/MetricCard";

/* ===================== CONFIG ===================== */

const BACKEND_URL = "http://localhost:9092"


/* ===================== THEME ===================== */

const COLORS = {
  bg: "#0b0f14",
  surface: "#111827",
  border: "#1f2937",
  textPrimary: "#e5e7eb",
  textSecondary: "#9ca3af",
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  blue: "#38bdf8",
};

/* ===================== TYPES ===================== */

type Metric = {
  value: number | null;
  status: string;
  prediction: string;
  event_ts: string | null;
};

type MetricsResponse = {
  service: string;
  timestamp: string;
  cpu: Metric;
  memory: Metric;
  latency: Metric;
};

type Incident = {
  id: string;
  service: string;
  metric: "CPU" | "Memory" | "Latency";
  severity: "HIGH" | "CRITICAL";
  status: "OPEN" | "RESOLVED";
  eventTs: string;
  logs: string[];
};


/* ===================== APP ===================== */

export default function App() {
  /* -------- Service -------- */
  const [services, setServices] = useState<string[]>([]);
  const [service, setService] = useState("");

  /* -------- Metrics -------- */
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  /* -------- Incidents -------- */
  const incidentsRef = useRef<Record<string, Incident>>({});
  const [incidents, setIncidents] = useState<Record<string, Incident>>({});

  /* -------- Filters -------- */
  const [metricFilter, setMetricFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [search, setSearch] = useState("");

  /* -------- Polling -------- */
  const [intervalSec, setIntervalSec] = useState(5);
  const intervalRef = useRef<number>(5);

  /* ===================== LOAD SERVICES ===================== */

  useEffect(() => {
      axios.get<string[]>(`${BACKEND_URL}/services`).then((res) => {
      setServices(res.data);
      if (res.data.length > 0) {
        setService(res.data[0]);
      }
    });
  }, []);

  /* ===================== METRICS + INCIDENTS ===================== */

  const fetchMetrics = async () => {
    if (!service) return;

    const res = await axios.get<MetricsResponse>(
      `${BACKEND_URL}/metrics?service=${service}`
    );

    setMetrics(res.data);
    setLastUpdated(new Date().toLocaleTimeString());

    const updated = { ...incidentsRef.current };

    const maybeCreateIncident = async (
      metric: Incident["metric"],
      status: string,
      eventTs: string | null
    ) => {
      if (!eventTs) return;
      if (!["High", "Critical"].includes(status)) return;

      // 30-second bucket to avoid duplicates
      const bucket = Math.floor(new Date(eventTs).getTime() / 30000);
      const id = `${service}-${metric}-${bucket}`;

      if (updated[id]) return;

      const logsRes = await axios.get(
        `${BACKEND_URL}/logs?service=${service}&event_ts=${eventTs}`
      );

      updated[id] = {
        id,
        service,
        metric,
        eventTs,
        logs: logsRes.data.logs || [],
        status: "OPEN",
        severity: status === "Critical" ? "CRITICAL" : "HIGH",
      };
    };

    await maybeCreateIncident("CPU", res.data.cpu.status, res.data.cpu.event_ts);
    await maybeCreateIncident("Memory", res.data.memory.status, res.data.memory.event_ts);
    await maybeCreateIncident("Latency", res.data.latency.status, res.data.latency.event_ts);

    incidentsRef.current = updated;
    setIncidents(updated);
  };

  /* ===================== POLLING ===================== */

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, intervalRef.current * 1000);
    return () => clearInterval(id);
  }, [service]);

  const applyInterval = () => {
    intervalRef.current = intervalSec;
    fetchMetrics();
  };

  /* ===================== FILTER + SORT ===================== */

  const visibleIncidents = Object.values(incidents)
    .filter((i) => i.service === service)
    .filter((i) => metricFilter === "ALL" || i.metric === metricFilter)
    .filter((i) => severityFilter === "ALL" || i.severity === severityFilter)
    .filter((i) => statusFilter === "ALL" || i.status === statusFilter)
    .filter((i) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        i.metric.toLowerCase().includes(q) ||
        i.severity.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q) ||
        i.logs.some((l) => l.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "SEVERITY" && a.severity !== b.severity) {
        return a.severity === "CRITICAL" ? -1 : 1;
      }
      const ta = new Date(a.eventTs).getTime();
      const tb = new Date(b.eventTs).getTime();
      return sortBy === "OLDEST" ? ta - tb : tb - ta;
    });

  if (!metrics) return null;

  /* ===================== UI ===================== */

  return (
    <Box sx={{ background: COLORS.bg, minHeight: "100vh", p: 3 }}>
      <Typography variant="h4" sx={{ color: COLORS.textPrimary }}>
        AIOps Control Plane
      </Typography>

      <Typography sx={{ color: COLORS.textSecondary, mb: 2 }}>
        Last updated: {lastUpdated}
      </Typography>

      {/* SERVICE + POLLING */}
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel sx={{ color: COLORS.textSecondary }}>Service</InputLabel>
          <Select
            value={service}
            label="Service"
            onChange={(e) => {
              setService(e.target.value);
              incidentsRef.current = {};
              setIncidents({});
            }}
            sx={{ background: COLORS.surface, color: COLORS.textPrimary }}
          >
            {services.map((s) => (
              <MenuItem key={s} value={s} sx={{ color: "black" }}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Fetch interval (sec)"
          type="number"
          size="small"
          value={intervalSec}
          
          onChange={(e) => setIntervalSec(Number(e.target.value))}
          sx={{ background: COLORS.surface, input: { color: COLORS.textPrimary } }}
        />

        <Button variant="contained" onClick={applyInterval}>
          Apply
        </Button>
      </Stack>

      {/* METRICS */}
      <Stack direction="row" spacing={2} mt={3} >
        <MetricCard name="CPU" {...metrics.cpu} />
        <MetricCard name="Memory" {...metrics.memory} />
        <MetricCard name="Latency" {...metrics.latency} /> 
      </Stack>

      {/* FILTERS */}
      <Stack direction="row" spacing={2} mt={4} flexWrap="wrap" >
        {[
          { label: "Metric", value: metricFilter, set: setMetricFilter, items: ["ALL", "CPU", "Memory", "Latency"] },
          { label: "Severity", value: severityFilter, set: setSeverityFilter, items: ["ALL", "HIGH", "CRITICAL"] },
          { label: "Status", value: statusFilter, set: setStatusFilter, items: ["ALL", "OPEN", "RESOLVED"] },
          { label: "Sort", value: sortBy, set: setSortBy, items: ["NEWEST", "OLDEST", "SEVERITY"] },
        ].map((f) => (
          <FormControl key={f.label} sx={{ minWidth: 160 }}>
            <InputLabel sx={{ color: COLORS.textSecondary }}>{f.label}</InputLabel>
            <Select
              value={f.value}
              label={f.label}
              onChange={(e) => f.set(e.target.value)}
              sx={{ background: COLORS.surface, color: COLORS.textPrimary }}
            >
              {f.items.map((i) => (
                <MenuItem key={i} value={i} sx={{ color: "black"}}>
                  {i}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}

        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ background: COLORS.surface, input: { color: "white" } }}
        />
      </Stack>

      {/* INCIDENTS */}
      {visibleIncidents.map((i) => (
        <Box key={i.id} mt={4}>
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ color: COLORS.textPrimary }}>
              <span style={{ color: COLORS.blue }}>{i.service}</span> | {i.metric} |{" "}
              <span style={{ color: i.severity === "CRITICAL" ? COLORS.red : COLORS.yellow }}>
                {i.severity}
              </span>{" "}
              |{" "}
              <span style={{ color: i.status === "OPEN" ? COLORS.yellow : COLORS.green }}>
                {i.status}
              </span>
            </Typography>

            {i.status === "OPEN" && (
              <Button
                size="small"
                onClick={() => {
                  incidentsRef.current[i.id].status = "RESOLVED";
                  setIncidents({ ...incidentsRef.current });
                }}
              >
                Resolve
              </Button>
            )}
          </Stack>

          <Box
            sx={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              p: 2,
              mt: 1,
              fontFamily: "monospace",
            }}
          >
            {i.logs.map((l, idx) => {
              let level = "INFO";
              try {
                level = JSON.parse(l).level;
              } catch {}

              const color =
                level === "ERROR"
                  ? COLORS.red
                  : level === "WARN"
                  ? COLORS.yellow
                  : COLORS.textSecondary;

              return (
                <Box
                  key={idx}
                  sx={{
                    borderLeft: `4px solid ${color}`,
                    pl: 1.5,
                    mb: 1,
                    color: COLORS.textPrimary,
                  }}
                >
                  <strong style={{ color }}>[{level}]</strong> {l}
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ mt: 3 }} />
        </Box>
      ))}
    </Box>
  );
}
