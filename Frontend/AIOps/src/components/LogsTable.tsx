import { Paper } from "@mui/material";

export default function LogsTable({ logs }: { logs: any[] }) {
  return (
    <Paper sx={{ padding: 2, maxHeight: 400, overflow: "auto" }}>
      {logs.map((log, i) => (
        <pre key={i}>{JSON.stringify(log, null, 2)}</pre>
      ))}
    </Paper>
  );
}
