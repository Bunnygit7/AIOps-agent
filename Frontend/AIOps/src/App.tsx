// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";

// function App() {
//   const [metrics, setMetrics] = useState({
//     cpu: { value: 0, prediction: "", status: "" },
//     memory: { value: 0, prediction: "", status: "" },
//     latency: { value: 0, prediction: "", status: "" },
//   });

//   const [logs, setLogs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const isFetching = useRef(false);

//   const fetchMetrics = async () => {
//     if (isFetching.current) return;
//     isFetching.current = true;

//     try {
//       const response = await axios.get("http://localhost:9091/metrics");
//       const data = response.data;

//       const cpu_ts = data[1];
//       const mem_ts = data[2];
//       const lat_ts = data[3];

//       const cpuValue = parseFloat(data[4]);
//       const memValue = parseFloat(data[5]);
//       const latValue = parseFloat(data[6]);

//       const cpuStatus = data[7];
//       const memStatus = data[8];
//       const latStatus = data[9];

//       const newLogs = [];

//       // Fetch logs when needed
//       if (["High", "Critical"].includes(cpuStatus)) {
//         const res = await axios.get(`http://localhost:9091/logs/${cpu_ts}`);
//         // console.log("CPU Logs Response:", res.data);
//         newLogs.push({ metric: "CPU", data: res.data });
//       }

//       if (["High", "Critical"].includes(memStatus)) {
//         const res = await axios.get(`http://localhost:9091/logs/${mem_ts}`);
//         // console.log("Memory Logs Response:", res.data);
//         newLogs.push({ metric: "Memory", data: res.data });
//       }

//       if (latStatus === "Critical") {
//         const res = await axios.get(`http://localhost:9091/logs/${lat_ts}`);
//         // console.log("Latency Logs Response:", res.data);
//         newLogs.push({ metric: "Latency", data: res.data });
//       }

//       // ML Predictions
//       const [cpuPred, memPred, latPred] = await Promise.all([
//         axios.get(`http://localhost:9091/cpu/${cpuValue}`),
//         axios.get(`http://localhost:9091/mem/${memValue}`),
//         axios.get(`http://localhost:9091/lat/${latValue}`),
//       ]);

//       setMetrics({
//         cpu: {
//           value: cpuValue,
//           prediction: cpuPred.data.prediction,
//           status: cpuStatus,
//         },
//         memory: {
//           value: memValue,
//           prediction: memPred.data.prediction,
//           status: memStatus,
//         },
//         latency: {
//           value: latValue,
//           prediction: latPred.data.prediction,
//           status: latStatus,
//         },
//       });

//       setLogs((prevLogs) => {
//   const combined = [...prevLogs, ...newLogs];

//   // Deduplicate logs by timestamp + message
//   const seen = new Set();
//   return combined.filter((group) =>
//     group.data.logs.every((raw) => {
//       try {
//         const parsed = JSON.parse(raw);
//         const key = parsed.timestamp + parsed.message;
//         if (seen.has(key)) return false;
//         seen.add(key);
//         return true;
//       } catch {
//         return true;
//       }
//     })
//   );
// });

//     } catch (err) {
//       console.error("Error fetching metrics:", err);
//     } finally {
//       setLoading(false);
//       isFetching.current = false;
//     }
//   };

//   useEffect(() => {
//     fetchMetrics();
//     const timer = setInterval(fetchMetrics, 5000);
//     return () => clearInterval(timer);
//   }, []);

//   if (loading) return <div>Loading metrics...</div>;

//   return (
//     <div style={{ padding: 20, fontFamily: "Arial" }}>
//       <h1>AIOps ML Dashboard</h1>

//       <div style={{ display: "flex", gap: 20 }}>
//         <MetricCard name="CPU" metric={metrics.cpu} />
//         <MetricCard name="Memory" metric={metrics.memory} />
//         <MetricCard name="Latency" metric={metrics.latency} />
//       </div>

//       <LogsPanel logs={logs} />
//     </div>
//   );
// }

// function MetricCard({ name, metric }) {
//   const color =
//     metric.status === "Critical" || metric.prediction === "Anomaly"
//       ? "#ff4d4f"
//       : metric.status === "High"
//       ? "#faad14"
//       : "#52c41a";

//   return (
//     <div
//       style={{
//         border: `2px solid ${color}`,
//         borderRadius: 10,
//         padding: 20,
//         width: 180,
//         textAlign: "center",
//       }}
//     >
//       <h2>{name}</h2>
//       <p><strong>Value:</strong> {metric.value}</p>
//       <p><strong>Status:</strong> <span style={{ color }}>{metric.status}</span></p>
//       <p><strong>ML Prediction:</strong> <span style={{ color }}>{metric.prediction}</span></p>
//     </div>
//   );
// }


// function LogsPanel({ logs }) {
//   const bottomRef = useRef(null);

//   // UI state
//   const [metricFilter, setMetricFilter] = useState("ALL");
//   const [levelFilter, setLevelFilter] = useState("ALL");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sortOrder, setSortOrder] = useState("NEWEST");
//   const [startTime, setStartTime] = useState(""); // NEW
//   const [endTime, setEndTime] = useState("");     // NEW

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [logs]);

//   if (!logs.length) return null;

//   const levelColor = (level) => {
//     switch (level) {
//       case "ERROR":
//         return "#ff4d4f";
//       case "WARN":
//         return "#faad14";
//       default:
//         return "#52c41a";
//     }
//   };

//   // Parse start/end time once
//   const startDate = startTime ? new Date(startTime) : null;
//   const endDate = endTime ? new Date(endTime) : null;

//   const filteredGroups = logs
//     .filter((group) => metricFilter === "ALL" || group.metric === metricFilter)
//     .map((group) => {
//       const parsedLogs = group.data.logs
//         .map((rawLog) => {
//           try {
//             const log = JSON.parse(rawLog);
//             return log;
//           } catch {
//             return null;
//           }
//         })
//         .filter(Boolean)
//         // Filter by log level, search, and time
//         .filter((log) => {
//           const levelMatch = levelFilter === "ALL" || log.level === levelFilter;
//           const searchMatch =
//             log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             log.logger.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             log.application.toLowerCase().includes(searchTerm.toLowerCase());
//           const logTime = new Date(log.timestamp);
//           const timeMatch =
//             (!startDate || logTime >= startDate) &&
//             (!endDate || logTime <= endDate);

//           return levelMatch && searchMatch && timeMatch;
//         });

//       parsedLogs.sort((a, b) => {
//         if (sortOrder === "NEWEST") return new Date(b.timestamp) - new Date(a.timestamp);
//         return new Date(a.timestamp) - new Date(b.timestamp);
//       });

//       return { metric: group.metric, logs: parsedLogs };
//     })
//     .filter((group) => group.logs.length > 0);

//   return (
//     <div style={{ marginTop: 30 }}>
//       <h2>⚠️ Incident Logs (Live)</h2>

//       {/* Filters */}
//       <div
//         style={{
//           display: "flex",
//           gap: 10,
//           marginBottom: 10,
//           flexWrap: "wrap",
//           alignItems: "center",
//         }}
//       >
//         <select value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)}>
//           <option value="ALL">All Metrics</option>
//           <option value="CPU">CPU</option>
//           <option value="Memory">Memory</option>
//           <option value="Latency">Latency</option>
//         </select>

//         <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
//           <option value="ALL">All Levels</option>
//           <option value="INFO">INFO</option>
//           <option value="WARN">WARN</option>
//           <option value="ERROR">ERROR</option>
//         </select>

//         <input
//           type="text"
//           placeholder="Search logs..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//         />

//         <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
//           <option value="NEWEST">Newest First</option>
//           <option value="OLDEST">Oldest First</option>
//         </select>

//         {/* NEW: Time filters */}
//         <div>
//           <label>
//             Start:
//             <input
//               type="datetime-local"
//               value={startTime}
//               onChange={(e) => setStartTime(e.target.value)}
//             />
//           </label>
//         </div>
//         <div>
//           <label>
//             End:
//             <input
//               type="datetime-local"
//               value={endTime}
//               onChange={(e) => setEndTime(e.target.value)}
//             />
//           </label>
//         </div>
//       </div>

//       <div
//         style={{
//           maxHeight: 400,
//           overflowY: "auto",
//           border: "1px solid #333",
//           padding: 10,
//           borderRadius: 6,
//         }}
//       >
//         {filteredGroups.map((group, i) => (
//           <div key={i} style={{ marginBottom: 20 }}>
//             <h3 style={{ color: "#1890ff" }}>{group.metric} Logs</h3>

//             {group.logs.map((log, j) => (
//               <div
//                 key={j}
//                 style={{
//                   background: "#111",
//                   color: "#fff",
//                   padding: 12,
//                   marginBottom: 8,
//                   borderLeft: `5px solid ${levelColor(log.level)}`,
//                   borderRadius: 4,
//                   fontFamily: "monospace",
//                 }}
//               >
//                 <div style={{ fontSize: 12, opacity: 0.8 }}>
//                   {log.timestamp} | {log.thread}
//                 </div>

//                 <div style={{ marginTop: 5 }}>
//                   <strong style={{ color: levelColor(log.level) }}>[{log.level}]</strong>{" "}
//                   {log.message}
//                 </div>

//                 <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
//                   {log.logger} — {log.application}
//                 </div>
//               </div>
//             ))}
//           </div>
//         ))}
//         <div ref={bottomRef} />
//       </div>
//     </div>
//   );
// }



// export default App;





// import { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import {
//   Box,
//   Typography,
//   Stack,
//   Button,
//   Select,
//   MenuItem,
//   Checkbox,
//   Divider,
// } from "@mui/material";
// import MetricCard from "./components/MetricCard";

// /* ===================== TYPES ===================== */

// type Metric = {
//   value: number;
//   status: string;
//   prediction: string;
//   event_ts: string;
// };

// type MetricsResponse = {
//   timestamp: string;
//   cpu: Metric;
//   memory: Metric;
//   latency: Metric;
// };

// type Incident = {
//   id: string;
//   metric: "CPU" | "Memory" | "Latency";
//   eventTs: string;
//   logs: string[];
//   status: "OPEN" | "RESOLVED";
//   severity: "HIGH" | "CRITICAL";
// };

// /* ===================== APP ===================== */

// export default function App() {
//   const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

//   // durable incidents (never wiped)
//   const incidentsRef = useRef<Record<string, Incident>>({});
//   const [incidents, setIncidents] = useState<Record<string, Incident>>({});

//   // UI state
//   const [metricFilter, setMetricFilter] = useState("ALL");
//   const [statusFilter, setStatusFilter] = useState("ALL");
//   const [severityFilter, setSeverityFilter] = useState("ALL");
//   const [sortOrder, setSortOrder] = useState("NEWEST");
//   const [selected, setSelected] = useState<Set<string>>(new Set());

//   /* ===================== FETCH + DETECT ===================== */

//   const fetchMetrics = async () => {
//     const res = await axios.get<MetricsResponse>(
//       "http://localhost:9091/metrics"
//     );

//     const data = res.data;
//     setMetrics(data);

//     const updated = { ...incidentsRef.current };

//     const createIncidentIfNeeded = async (
//       metric: Incident["metric"],
//       status: string,
//       eventTs: string
//     ) => {
//       const id = `${metric}-${eventTs}`;
//       if (updated[id]) return;

//       const logsRes = await axios.get(
//         `http://localhost:9091/logs/${eventTs}`
//       );

//       updated[id] = {
//         id,
//         metric,
//         eventTs,
//         logs: logsRes.data.logs,
//         status: "OPEN",
//         severity: status === "Critical" ? "CRITICAL" : "HIGH",
//       };
//     };

//     if (["High", "Critical"].includes(data.cpu.status)) {
//       await createIncidentIfNeeded("CPU", data.cpu.status, data.cpu.event_ts);
//     }

//     if (["High", "Critical"].includes(data.memory.status)) {
//       await createIncidentIfNeeded(
//         "Memory",
//         data.memory.status,
//         data.memory.event_ts
//       );
//     }

//     if (data.latency.status === "Critical") {
//       await createIncidentIfNeeded(
//         "Latency",
//         data.latency.status,
//         data.latency.event_ts
//       );
//     }

//     incidentsRef.current = updated;
//     setIncidents(updated);
//   };

//   useEffect(() => {
//     fetchMetrics();
//     const id = setInterval(fetchMetrics, 5000);
//     return () => clearInterval(id);
//   }, []);

//   /* ===================== BULK ACTIONS ===================== */

//   const resolveIncident = (id: string) => {
//     incidentsRef.current[id].status = "RESOLVED";
//     setIncidents({ ...incidentsRef.current });
//   };

//   const resolveSelected = () => {
//     selected.forEach((id) => {
//       incidentsRef.current[id].status = "RESOLVED";
//     });
//     setSelected(new Set());
//     setIncidents({ ...incidentsRef.current });
//   };

//   const resolveAllOpen = () => {
//     Object.values(incidentsRef.current).forEach((i) => {
//       if (i.status === "OPEN") i.status = "RESOLVED";
//     });
//     setSelected(new Set());
//     setIncidents({ ...incidentsRef.current });
//   };

//   /* ===================== FILTER + SORT ===================== */

//   let visible = Object.values(incidents)
//     .filter((i) => metricFilter === "ALL" || i.metric === metricFilter)
//     .filter((i) => statusFilter === "ALL" || i.status === statusFilter)
//     .filter((i) => severityFilter === "ALL" || i.severity === severityFilter);

//   visible.sort((a, b) => {
//     if (sortOrder === "SEVERITY") {
//       return a.severity === b.severity
//         ? 0
//         : a.severity === "CRITICAL"
//         ? -1
//         : 1;
//     }
//     const ta = new Date(a.eventTs).getTime();
//     const tb = new Date(b.eventTs).getTime();
//     return sortOrder === "NEWEST" ? tb - ta : ta - tb;
//   });

//   if (!metrics) return null;

//   /* ===================== UI ===================== */

//   return (
//     <Box sx={{ background: "#000", minHeight: "100vh", padding: 3 }}>
//       <Typography variant="h4" color="#fff" gutterBottom>
//         AIOps Control Plane
//       </Typography>

//       <Typography color="#aaa" gutterBottom>
//         Last update: {new Date(metrics.timestamp).toLocaleTimeString()}
//       </Typography>

//       {/* METRICS */}
//       <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={4}>
//         <MetricCard name="CPU" {...metrics.cpu} />
//         <MetricCard name="Memory" {...metrics.memory} />
//         <MetricCard name="Latency" {...metrics.latency} />
//       </Stack>

//       {/* FILTER + SORT BAR */}
//       <Box
//         sx={{
//           background: "#0d1117",
//           border: "1px solid #30363d",
//           borderRadius: 2,
//           padding: 2,
//           marginBottom: 3,
//         }}
//       >
//         <Typography color="#fff" gutterBottom>
//           Incident Controls
//         </Typography>

//         <Stack direction="row" spacing={2} flexWrap="wrap">
//           <Select value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)} size="small" sx={{ background: "#161b22", color: "#fff" }}>
//             <MenuItem value="ALL">All Metrics</MenuItem>
//             <MenuItem value="CPU">CPU</MenuItem>
//             <MenuItem value="Memory">Memory</MenuItem>
//             <MenuItem value="Latency">Latency</MenuItem>
//           </Select>

//           <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ background: "#161b22", color: "#fff" }}>
//             <MenuItem value="ALL">All Status</MenuItem>
//             <MenuItem value="OPEN">Open</MenuItem>
//             <MenuItem value="RESOLVED">Resolved</MenuItem>
//           </Select>

//           <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} size="small" sx={{ background: "#161b22", color: "#fff" }}>
//             <MenuItem value="ALL">All Severity</MenuItem>
//             <MenuItem value="HIGH">High</MenuItem>
//             <MenuItem value="CRITICAL">Critical</MenuItem>
//           </Select>

//           <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} size="small" sx={{ background: "#161b22", color: "#fff" }}>
//             <MenuItem value="NEWEST">Newest First</MenuItem>
//             <MenuItem value="OLDEST">Oldest First</MenuItem>
//             <MenuItem value="SEVERITY">Severity First</MenuItem>
//           </Select>

//           <Button variant="outlined" color="success" onClick={resolveSelected} disabled={selected.size === 0}>
//             Resolve Selected
//           </Button>

//           <Button variant="outlined" color="error" onClick={resolveAllOpen}>
//             Resolve All
//           </Button>
//         </Stack>
//       </Box>

//       {/* INCIDENT LIST */}
//       {visible.map((i) => (
//         <Box key={i.id} mb={4}>
//           <Stack direction="row" alignItems="center" spacing={1}>
//             <Checkbox
//               checked={selected.has(i.id)}
//               onChange={(e) => {
//                 const s = new Set(selected);
//                 e.target.checked ? s.add(i.id) : s.delete(i.id);
//                 setSelected(s);
//               }}
//             />

//             <Typography
//               sx={{
//                 color: i.severity === "CRITICAL" ? "#ff4d4f" : "#faad14",
//                 fontWeight: 600,
//               }}
//             >
//               {i.metric} | {i.severity} | {i.status} @{" "}
//               {new Date(i.eventTs).toLocaleTimeString()}
//             </Typography>

//             {i.status === "OPEN" && (
//               <Button size="small" onClick={() => resolveIncident(i.id)}>
//                 Resolve
//               </Button>
//             )}
//           </Stack>

//           <Box
//             sx={{
//               background: "#0d1117",
//               border: "1px solid #30363d",
//               padding: 2,
//               borderRadius: 2,
//               fontFamily: "monospace",
//               maxHeight: 260,
//               overflow: "auto",
//               marginTop: 1,
//             }}
//           >
//             {i.logs.map((raw, idx) => {
//               let level = "INFO";
//               try {
//                 level = JSON.parse(raw).level || "INFO";
//               } catch {}

//               const color =
//                 level === "ERROR"
//                   ? "#ff4d4f"
//                   : level === "WARN"
//                   ? "#faad14"
//                   : "#8b949e";

//               return (
//                 <Box
//                   key={idx}
//                   sx={{
//                     borderLeft: `4px solid ${color}`,
//                     paddingLeft: 1.5,
//                     marginBottom: 1,
//                     color: "#c9d1d9",
//                   }}
//                 >
//                   <strong style={{ color }}>[{level}]</strong> {raw}
//                 </Box>
//               );
//             })}
//           </Box>

//           <Divider sx={{ marginTop: 3 }} />
//         </Box>
//       ))}
//     </Box>
//   );
// }










///////////////////////////////////////////////////////////////





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
    axios.get<string[]>("http://localhost:9092/services").then((res) => {
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
      `http://localhost:9092/metrics?service=${service}`
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
        `http://localhost:9092/logs?service=${service}&event_ts=${eventTs}`
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
