import { Navigate, Route, Routes, Link as RouterLink } from 'react-router-dom'
import { AppBar, Button, Toolbar, Typography } from '@mui/material'
import NeighborhoodsPage from './pages/NeighborhoodsPage'
import ProjectsPage from './pages/ProjectsPage'

export default function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PropIQ
          </Typography>
          <Button color="inherit" component={RouterLink} to="/neighborhoods">
            Neighborhoods
          </Button>
          <Button color="inherit" component={RouterLink} to="/projects">
            Projects
          </Button>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Navigate to="/neighborhoods" replace />} />
        <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
      </Routes>
    </>
  )
}
