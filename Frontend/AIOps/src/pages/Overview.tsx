// import { Typography, Stack, Box } from "@mui/material";
// import { useQuery } from "@tanstack/react-query";
// import { fetchMetrics } from "../api/metricsApi";
// import MetricCard from "../components/MetricCard";

// export default function Overview() {
//   const { data, isLoading, isError } = useQuery({
//     queryKey: ["metrics"],
//     queryFn: fetchMetrics,
//     refetchInterval: 5000,
//   });

//   if (isLoading) {
//     return <Typography>Loading metrics...</Typography>;
//   }

//   if (isError || !data) {
//     return <Typography color="error">Failed to load metrics</Typography>;
//   }

//   return (
//     <>
//       <Typography variant="h5" gutterBottom>
//         System Overview
//       </Typography>

//       {/* Responsive layout without Grid */}
//       <Stack
//         direction={{ xs: "column", md: "row" }}
//         spacing={2}
//       >
//         <Box flex={1}>
//           <MetricCard
//             title="CPU"
//             value={data.cpu.value}
//             status={data.cpu.status}
//           />
//         </Box>

//         <Box flex={1}>
//           <MetricCard
//             title="Memory"
//             value={data.memory.value}
//             status={data.memory.status}
//           />
//         </Box>

//         <Box flex={1}>
//           <MetricCard
//             title="Latency"
//             value={data.latency.value}
//             status={data.latency.status}
//           />
//         </Box>
//       </Stack>
//     </>
//   );
// }
