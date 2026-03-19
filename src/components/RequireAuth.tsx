/**
 * Wraps protected routes. Redirects to /login if no session.
 * Shows a centered spinner while the auth loading state resolves
 * to avoid a flash of the login page on page reload.
 */

import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  if (user === null) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
