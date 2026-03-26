'use client'

/**
 * NavBar — top app bar shown on every route.
 *
 * Nav links and logout are only rendered when the user is authenticated.
 * Ported from the inline NavBar in src/App.tsx.
 *
 * Changes from Vite version:
 * - next/link replaces react-router-dom Link
 * - useRouter from next/navigation replaces useNavigate
 * - logout() imported from lib/auth.ts (browser client)
 */

import { AppBar, Button, Toolbar, Typography } from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { logout } from '../lib/auth'

export default function NavBar() {
  const { user } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          PropIQ
        </Typography>

        {user && (
          <>
            <Button color="inherit" component={Link} href="/neighborhoods">
              Neighborhoods
            </Button>
            <Button color="inherit" component={Link} href="/projects">
              Projects
            </Button>
            <Button color="inherit" component={Link} href="/search">
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
