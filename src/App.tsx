import { Navigate, Route, Routes, Link as RouterLink } from 'react-router-dom'
import { AppBar, Button, Toolbar, Typography } from '@mui/material'
import NeighborhoodsPage from './pages/NeighborhoodsPage'
import ProjectsPage from './pages/ProjectsPage'
import UnitsPage from './pages/UnitsPage'
import SearchPage from './pages/SearchPage'

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
          <Button color="inherit" component={RouterLink} to="/search">
            Search
          </Button>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Navigate to="/neighborhoods" replace />} />
        <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id/units" element={<UnitsPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </>
  )
}
