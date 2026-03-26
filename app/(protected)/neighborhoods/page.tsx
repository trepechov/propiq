'use client'

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
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { getNeighborhoods, deleteNeighborhood } from '@/lib/supabase/neighborhoods'
import type { Neighborhood } from '@/types'
import NeighborhoodForm from '@/components/NeighborhoodForm'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'

const NOTES_MAX_LENGTH = 80

function truncate(text: string | null, max: number): string {
  if (!text) return '—'
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export default function NeighborhoodsPage() {
  type SortDir = 'asc' | 'desc'

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [sortField, setSortField]         = useState<string>('name')
  const [sortDir, setSortDir]             = useState<SortDir>('asc')
  const [formOpen, setFormOpen]           = useState(false)
  const [editing, setEditing]             = useState<Neighborhood | undefined>(undefined)
  const [deleteTarget, setDeleteTarget]   = useState<Neighborhood | null>(null)
  const [deleting, setDeleting]           = useState(false)

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

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...neighborhoods].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const av = a[sortField as keyof Neighborhood] as string | number | null
    const bv = b[sortField as keyof Neighborhood] as string | number | null
    if (av === null || av === undefined) return dir
    if (bv === null || bv === undefined) return -dir
    if (typeof av === 'string' && typeof bv === 'string')
      return dir * av.localeCompare(bv, undefined, { numeric: true })
    if (typeof av === 'number' && typeof bv === 'number')
      return dir * (av - bv)
    return 0
  })

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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteNeighborhood(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete neighborhood')
    } finally {
      setDeleting(false)
    }
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
            <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: 'grey.100', fontWeight: 600 } }}>
              <TableRow>
                <TableCell sortDirection={sortField === 'name' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDir : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'city' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'city'}
                    direction={sortField === 'city' ? sortDir : 'asc'}
                    onClick={() => handleSort('city')}
                  >
                    City
                  </TableSortLabel>
                </TableCell>
                <TableCell>Target Buyers</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((n) => (
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
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(n) }}
                        aria-label="edit neighborhood"
                        sx={{ color: 'grey.700' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(n) }}
                        aria-label="delete neighborhood"
                        sx={{ color: 'grey.700' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
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

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete Neighborhood?"
        description={`Permanently delete "${deleteTarget?.name}"? This will also delete all linked projects and units. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Container>
  )
}
