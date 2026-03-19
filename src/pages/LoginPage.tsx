import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { login } from '../services/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="xs" sx={{ pt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Sign in to PropIQ
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
            autoComplete="current-password"
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Login'}
          </Button>

          <Typography variant="body2" align="center">
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>
        </Stack>
      </Box>
    </Container>
  )
}
