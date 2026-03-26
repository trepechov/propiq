'use client'

/**
 * Register page — ported from src/pages/RegisterPage.tsx.
 *
 * Changes from Vite version:
 * - useRouter from next/navigation replaces useNavigate
 * - next/link replaces react-router-dom Link
 * - register() imported from lib/auth.ts
 * - Redirects to /neighborhoods on success (not /)
 */

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register } from '../../../lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    if (!username.trim()) return 'Username is required'
    if (password !== confirmPassword) return 'Passwords do not match'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setLoading(true)

    try {
      await register(username.trim(), password)
      router.push('/neighborhoods')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="xs" sx={{ pt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Create a PropIQ account
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2} mt={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
            fullWidth
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            fullWidth
          />

          <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Register'}
          </Button>

          <Typography variant="body2" align="center">
            Already have an account?{' '}
            <MuiLink component={Link} href="/login">
              Login
            </MuiLink>
          </Typography>
        </Stack>
      </Box>
    </Container>
  )
}
