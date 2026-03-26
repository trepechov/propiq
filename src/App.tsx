import { Navigate, Route, Routes, Link as RouterLink } from 'react-router-dom'
import { AppBar, Button, Toolbar, Typography } from '@mui/material'
import { useAuth } from './context/AuthContext'
import { logout } from './services/auth'
import RequireAuth from './components/RequireAuth'
import NeighborhoodsPage from './views/NeighborhoodsPage'
import ProjectsPage from './views/ProjectsPage'
import UnitsPage from './views/UnitsPage'
import SearchPage from './views/SearchPage'
import LoginPage from './views/LoginPage'
import RegisterPage from './views/RegisterPage'

function NavBar() {
  const { user } = useAuth()

  async function handleLogout() {
    await logout()
  }

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          PropIQ
        </Typography>
        {user && (
          <>
            <Button color="inherit" component={RouterLink} to="/neighborhoods">
              Neighborhoods
            </Button>
            <Button color="inherit" component={RouterLink} to="/projects">
              Projects
            </Button>
            <Button color="inherit" component={RouterLink} to="/search">
              Search
            </Button>
            <Typography variant="body2" color="inherit">
              {user.username}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/neighborhoods" replace />} />
          <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id/units" element={<UnitsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      </Routes>
    </>
  )
}
