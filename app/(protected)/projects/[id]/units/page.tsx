'use client'

/**
 * Units listing page — shows all units for a specific project.
 *
 * Accessed via /projects/[id]/units. Displays units in a table
 * and provides an "Import Units" button to paste and parse tabular data.
 *
 * Payment scheme management moved to the Edit Project modal (ProjectFields).
 *
 * Next.js 15 async params: params is a Promise<{ id: string }>.
 * Unwrapped via React's `use()` hook in Client Components.
 */

import { use, useEffect, useMemo, useState } from 'react'
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
  TableContainer,
  Typography,
} from '@mui/material'
import { getProject } from '@/lib/supabase/projects'
import { getUnits, deleteUnit } from '@/lib/supabase/units'
import type { Unit, Project } from '@/types'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'
import UnitsImportForm from '@/components/UnitsImportForm'
import UnitRow, { UnitsTableHead } from './UnitRow'
import { useTableFilter } from '@/hooks/useTableFilter'
import TableFilterBar from '@/components/TableFilterBar'
import {
  buildUnitComparator,
  buildUnitFilterConfigs,
} from '../UnitsPage.helpers'
import type { SortDir } from '../UnitsPage.helpers'


interface PageProps {
  params: Promise<{ id: string }>
}

const UNIT_FILTER_CONFIGS = buildUnitFilterConfigs()

export default function UnitsPage({ params }: PageProps) {
  const { id: projectId } = use(params)

  const [project, setProject]         = useState<Project | null>(null)
  const [units, setUnits]             = useState<Unit[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [importOpen, setImportOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [sortField, setSortField] = useState<string>('apartment_number')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')

  const filterConfigs = useMemo(() => UNIT_FILTER_CONFIGS, [])
  const {
    filterState,
    setTextFilter,
    setEnumFilter,
    setNumberFilter,
    setDateFilter,
    clearFilters,
    filteredRows,
    isFiltered,
  } = useTableFilter(units, filterConfigs)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [projectData, unitData] = await Promise.all([
        getProject(projectId),
        getUnits(projectId),
      ])
      setProject(projectData)
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

  const sorted = [...filteredRows].sort(buildUnitComparator(sortField, sortDir))

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
            Units{project ? ` — ${project.title}` : ''}
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
        <>
        <TableFilterBar
          configs={filterConfigs}
          filterState={filterState}
          onTextChange={setTextFilter}
          onEnumChange={setEnumFilter}
          onNumberChange={setNumberFilter}
          onDateChange={setDateFilter}
          onClear={clearFilters}
          isFiltered={isFiltered}
        />
        <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <UnitsTableHead
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              priceSqmHeader="Price/m² (VAT)"
              totalPriceHeader="Total Price (VAT)"
            />
            <TableBody>
              {sorted.map((unit) => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  displayPriceSqm={unit.price_sqm_vat}
                  displayTotalPrice={unit.total_price_vat}
                  onDelete={() => setDeleteTarget(unit)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </>
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
