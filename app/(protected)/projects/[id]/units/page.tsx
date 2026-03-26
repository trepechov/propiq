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
  Link as MuiLink,
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
import { getProject } from '@/lib/supabase/projects'
import { getUnits } from '@/lib/supabase/units'
import type { Unit } from '@/types'
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

  const [projectName, setProjectName] = useState<string>('')
  const [units, setUnits]             = useState<Unit[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [importOpen, setImportOpen]   = useState(false)

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

  function handleSaved() {
    load()
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
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Number / ID</TableCell>
                <TableCell align="right">Floor</TableCell>
                <TableCell align="right">Net Area</TableCell>
                <TableCell align="right">Total Area</TableCell>
                <TableCell align="right">Price/m² (VAT)</TableCell>
                <TableCell align="right">Total Price (VAT)</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {units.map((unit) => (
                <UnitRow key={unit.id} unit={unit} />
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
    </Container>
  )
}

interface UnitRowProps {
  unit: Unit
}

function UnitRow({ unit }: UnitRowProps) {
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
    </TableRow>
  )
}
