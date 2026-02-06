import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { Link } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography sx={{ flexGrow: 1 }}>
            AIOps Monitoring
          </Typography>
          <Button color="inherit" component={Link} to="/">Overview</Button>
          <Button color="inherit" component={Link} to="/metrics">Metrics</Button>
          <Button color="inherit" component={Link} to="/logs">Logs</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ padding: 3 }}>{children}</Box>
    </Box>
  );
}

