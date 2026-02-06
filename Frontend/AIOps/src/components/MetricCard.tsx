// import { Box, Typography } from "@mui/material";

// type Props = {
//   name: string;
//   value: number;
//   status: string;
//   prediction?: string;
// };

// export default function MetricCard({ name, value, status, prediction }: Props) {
//   const color =
//     status === "Critical" || prediction === "Anomaly"
//       ? "#ff4d4f"
//       : status === "High"
//       ? "#faad14"
//       : "#52c41a";

//   return (
//     <Box
//       sx={{
//         flex: 1,
//         padding: 2,
//         borderRadius: 2,
//         border: `2px solid ${color}`,
//         background: "#111",
//         color: "#fff",
//       }}
//     >
//       <Typography variant="h6">{name}</Typography>
//       <Typography variant="h4">{value}</Typography>
//       <Typography>Status: <span style={{ color }}>{status}</span></Typography>
//       {prediction && (
//         <Typography>
//           ML: <span style={{ color }}>{prediction}</span>
//         </Typography>
//       )}
//     </Box>
//   );
// }








//////////////////////////////////////////////////////////////////////



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
