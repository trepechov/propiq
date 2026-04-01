'use client'

/**
 * NavBar — top app bar shown on every route.
 *
 * Nav links are only rendered when the user is authenticated.
 * User menu (avatar icon → dropdown) holds username label + logout.
 * Additional user actions can be added to the Menu in future.
 */

import { useState } from 'react'
import {
  AppBar,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import ApartmentIcon from '@mui/icons-material/Apartment'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import LogoutIcon from '@mui/icons-material/Logout'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { logout } from '../lib/auth'

export default function NavBar() {
  const { user } = useAuth()
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  async function handleLogout() {
    setAnchorEl(null)
    await logout()
    router.push('/login')
  }

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 1 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          PropIQ
        </Typography>

        {user && (
          <>
            <Button color="inherit" component={Link} href="/neighborhoods" startIcon={<LocationCityIcon />}>
              Neighborhoods
            </Button>
            <Button color="inherit" component={Link} href="/projects" startIcon={<ApartmentIcon />}>
              Projects
            </Button>
            <Button color="inherit" component={Link} href="/search" startIcon={<SearchIcon />}>
              Search
            </Button>

            <IconButton
              color="inherit"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              aria-label="user menu"
              aria-controls={anchorEl ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={anchorEl ? 'true' : undefined}
            >
              <AccountCircleIcon />
            </IconButton>

            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user.username}
                </Typography>
              </MenuItem>
              <MenuItem component={Link} href="/criteria" onClick={() => setAnchorEl(null)}>
                <ListItemIcon><TuneIcon fontSize="small" /></ListItemIcon>
                AI Criteria
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  )
}
