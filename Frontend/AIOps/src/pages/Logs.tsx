import { useEffect, useState } from "react";
import axios from "axios";
import { Typography, Paper } from "@mui/material";

type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  logger: string;
  application: string;
};

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("http://localhost:9091/logs/latest");
        const parsed = res.data.logs
          .map((l: string) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        setLogs(parsed);
        setError(false);
      } catch (err) {
        console.error("Failed to fetch logs", err);
        setError(true);
      }
    };

    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return <Typography color="error">Failed to load logs</Typography>;
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Live Logs
      </Typography>

      <Paper
        sx={{
          padding: 2,
          maxHeight: 500,
          overflow: "auto",
          backgroundColor: "#111",
          color: "#fff",
        }}
      >
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {log.timestamp} | {log.logger}
            </div>
            <div>
              <strong>[{log.level}]</strong> {log.message}
            </div>
          </div>
        ))}
      </Paper>
    </>
  );
}
