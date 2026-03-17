/**
 * Neighborhoods listing page — displays all saved neighborhoods in a sortable
 * table. Users can add new neighborhoods or edit existing ones via a dialog.
 */

import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { getNeighborhoods } from '../services/neighborhoods'
import type { Neighborhood } from '../types'
import NeighborhoodForm from '../components/NeighborhoodForm'

const NOTES_MAX_LENGTH = 80

function truncate(text: string | null, max: number): string {
  if (!text) return '—'
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export default function NeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [formOpen, setFormOpen]           = useState(false)
  const [editing, setEditing]             = useState<Neighborhood | undefined>(undefined)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getNeighborhoods()
      setNeighborhoods(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load neighborhoods')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleAdd() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function handleRowClick(neighborhood: Neighborhood) {
    setEditing(neighborhood)
    setFormOpen(true)
  }

  function handleSaved() {
    load()
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Neighborhoods</Typography>
        <Button variant="contained" onClick={handleAdd}>
          Add Neighborhood
        </Button>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && neighborhoods.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary" mb={2}>
            No neighborhoods saved yet.
          </Typography>
          <Button variant="contained" onClick={handleAdd}>
            Add Neighborhood
          </Button>
        </Box>
      )}

      {!loading && !error && neighborhoods.length > 0 && (
        <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Target Buyers</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {neighborhoods.map((n) => (
                <TableRow
                  key={n.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(n)}
                >
                  <TableCell>{n.name}</TableCell>
                  <TableCell>{n.city}</TableCell>
                  <TableCell>{n.target_buyers.join(', ') || '—'}</TableCell>
                  <TableCell>{truncate(n.neighbourhood_notes, NOTES_MAX_LENGTH)}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleRowClick(n) }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <NeighborhoodForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        existing={editing}
      />
    </Container>
  )
}
