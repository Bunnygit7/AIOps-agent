import { Box, Typography } from "@mui/material";

const COLORS = {
  textPrimary: "#e6edf3",
  green: "#3fb950",
  yellow: "#d29922",
  red: "#f85149",
};

type Props = {
  name: string;
  value: number | null;
  status: string;
  prediction?: string;
};

export default function MetricCard({ name, value, status, prediction }: Props) {
  const color =
    status === "Critical" || prediction === "Anomaly"
      ? COLORS.red
      : status === "High"
      ? COLORS.yellow
      : COLORS.green;

  return (
    <Box
      sx={{
        flex: 1,
        p: 2,
        border: `2px solid ${color}`,
        borderRadius: 2,
        background: "#111",
      }}
    >
      <Typography component="div" sx={{ color: COLORS.textPrimary }}>
        {name}
      </Typography>

      <Typography component="div" variant="h4" sx={{ color }}>
        {value ?? "--"} {name === "Latency" ? "ms" : "%"} 
      </Typography>

      <Typography component="div" sx={{ color }}>
        {status}
      </Typography>

      {prediction && (
        <Typography component="div" sx={{ color }}>
          ML: {prediction}
        </Typography>
      )}
    </Box>
  );
}
