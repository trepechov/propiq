'use client'

/**
 * Units listing page — shows all units for a specific project.
 *
 * Accessed via /projects/[id]/units. Displays units in a table
 * and provides an "Import Units" button to paste and parse tabular data.
 *
 * Next.js 15 async params: params is a Promise<{ id: string }>.
 * Unwrapped via React's `use()` hook in Client Components.
 */

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Link as MuiLink,
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
import { getProject } from '@/lib/supabase/projects'
import { getUnits, deleteUnit } from '@/lib/supabase/units'
import type { Unit } from '@/types'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'
import {
  UNIT_TYPE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_DIRECTION_LABELS,
} from '@/config/domain'
import type { UnitType, UnitStatus, UnitDirection } from '@/config/domain'
import UnitsImportForm from '@/components/UnitsImportForm'

function formatNumber(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString()
}

function formatArea(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)} m²`
}

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString()
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function UnitsPage({ params }: PageProps) {
  // Next.js 15 + React 19: unwrap async params with use()
  const { id: projectId } = use(params)

  type SortDir = 'asc' | 'desc'

  const [projectName, setProjectName] = useState<string>('')
  const [units, setUnits]             = useState<Unit[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [importOpen, setImportOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [sortField, setSortField]       = useState<string>('apartment_number')
  const [sortDir, setSortDir]           = useState<SortDir>('asc')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [project, unitData] = await Promise.all([
        getProject(projectId),
        getUnits(projectId),
      ])
      setProjectName(project.title)
      setUnits(unitData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load units')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...units].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'apartment_number') {
      const av = a.apartment_number ?? a.identifier ?? ''
      const bv = b.apartment_number ?? b.identifier ?? ''
      return dir * av.localeCompare(bv, undefined, { numeric: true })
    }
    const av = a[sortField as keyof Unit] as string | number | null
    const bv = b[sortField as keyof Unit] as string | number | null
    if (av === null || av === undefined) return dir
    if (bv === null || bv === undefined) return -dir
    if (typeof av === 'string' && typeof bv === 'string')
      return dir * av.localeCompare(bv, undefined, { numeric: true })
    if (typeof av === 'number' && typeof bv === 'number')
      return dir * (av - bv)
    return 0
  })

  function handleSaved() {
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUnit(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete unit')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={1} mb={3}>
        <MuiLink component={Link} href="/projects" underline="hover" color="inherit">
          ← Back to Projects
        </MuiLink>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            Units{projectName ? ` — ${projectName}` : ''}
          </Typography>
          <Button variant="contained" onClick={() => setImportOpen(true)}>
            Import Units
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && units.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary" mb={2}>
            No units imported yet.
          </Typography>
          <Button variant="contained" onClick={() => setImportOpen(true)}>
            Import Units
          </Button>
        </Box>
      )}

      {!loading && !error && units.length > 0 && (
        <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: 'grey.100', fontWeight: 600 } }}>
              <TableRow>
                <TableCell sortDirection={sortField === 'unit_type' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'unit_type'}
                    direction={sortField === 'unit_type' ? sortDir : 'asc'}
                    onClick={() => handleSort('unit_type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'apartment_number' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'apartment_number'}
                    direction={sortField === 'apartment_number' ? sortDir : 'asc'}
                    onClick={() => handleSort('apartment_number')}
                  >
                    Number / ID
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'floor' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'floor'}
                    direction={sortField === 'floor' ? sortDir : 'asc'}
                    onClick={() => handleSort('floor')}
                  >
                    Floor
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'net_area' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'net_area'}
                    direction={sortField === 'net_area' ? sortDir : 'asc'}
                    onClick={() => handleSort('net_area')}
                  >
                    Net Area
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'total_area' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'total_area'}
                    direction={sortField === 'total_area' ? sortDir : 'asc'}
                    onClick={() => handleSort('total_area')}
                  >
                    Total Area
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'price_sqm_vat' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'price_sqm_vat'}
                    direction={sortField === 'price_sqm_vat' ? sortDir : 'asc'}
                    onClick={() => handleSort('price_sqm_vat')}
                  >
                    Price/m² (VAT)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'total_price_vat' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'total_price_vat'}
                    direction={sortField === 'total_price_vat' ? sortDir : 'asc'}
                    onClick={() => handleSort('total_price_vat')}
                  >
                    Total Price (VAT)
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'direction' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'direction'}
                    direction={sortField === 'direction' ? sortDir : 'asc'}
                    onClick={() => handleSort('direction')}
                  >
                    Direction
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'status' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDir : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((unit) => (
                <UnitRow key={unit.id} unit={unit} onDelete={() => setDeleteTarget(unit)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UnitsImportForm
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={handleSaved}
        projectId={projectId}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete Unit?"
        description={`Permanently delete unit "${[deleteTarget?.unit_type, deleteTarget?.apartment_number ?? deleteTarget?.identifier].filter(Boolean).join(' ') || 'this unit'}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Container>
  )
}

interface UnitRowProps {
  unit: Unit
  onDelete: () => void
}

function UnitRow({ unit, onDelete }: UnitRowProps) {
  const typeLabel      = UNIT_TYPE_LABELS[unit.unit_type as UnitType] ?? unit.unit_type
  const statusLabel    = UNIT_STATUS_LABELS[unit.status as UnitStatus] ?? unit.status
  const directionLabel = unit.direction
    ? (UNIT_DIRECTION_LABELS[unit.direction as UnitDirection] ?? unit.direction)
    : '—'

  const identifier = unit.apartment_number ?? unit.identifier ?? '—'

  return (
    <TableRow hover>
      <TableCell>{typeLabel}</TableCell>
      <TableCell>{identifier}</TableCell>
      <TableCell align="right">{formatNumber(unit.floor)}</TableCell>
      <TableCell align="right">{formatArea(unit.net_area)}</TableCell>
      <TableCell align="right">{formatArea(unit.total_area)}</TableCell>
      <TableCell align="right">{formatPrice(unit.price_sqm_vat)}</TableCell>
      <TableCell align="right">{formatPrice(unit.total_price_vat)}</TableCell>
      <TableCell>{directionLabel}</TableCell>
      <TableCell>{statusLabel}</TableCell>
      <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {unit.notes ?? '—'}
      </TableCell>
      <TableCell align="right">
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label="delete unit"
          sx={{ color: 'grey.500' }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  )
}
