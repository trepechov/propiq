'use client'

/**
 * Projects listing page — displays all saved projects in a table.
 * Users can add new projects or edit existing ones via a dialog.
 * Each row links to the Units screen for that project.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import ApartmentIcon from '@mui/icons-material/Apartment'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { getProjects, deleteProject } from '@/lib/supabase/projects'
import { getNeighborhoods } from '@/lib/supabase/neighborhoods'
import type { Project, Neighborhood } from '@/types'
import ProjectForm from '@/components/ProjectForm'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'
import TableFilterBar from '@/components/TableFilterBar'
import { useTableFilter } from '@/hooks/useTableFilter'
import type { BuildingStage } from '@/config/domain'
import { BUILDING_STAGE_LABELS } from '@/config/domain'
import { buildProjectComparator, buildProjectFilterConfigs } from './ProjectsPage.helpers'
import type { SortDir } from './ProjectsPage.helpers'


function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null) return '—'
  const symbol = currency ?? 'EUR'
  return `${value.toLocaleString()} ${symbol}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return value.slice(0, 7)
}

export default function ProjectsPage() {
  const router = useRouter()

  const [projects, setProjects]           = useState<Project[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [formOpen, setFormOpen]           = useState(false)
  const [editing, setEditing]             = useState<Project | undefined>(undefined)
  const [deleteTarget, setDeleteTarget]   = useState<Project | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [sortField, setSortField]         = useState<string>('title')
  const [sortDir, setSortDir]             = useState<SortDir>('asc')

  const filterConfigs = useMemo(
    () => buildProjectFilterConfigs(neighborhoods),
    [neighborhoods],
  )

  const {
    filterState,
    setTextFilter,
    setEnumFilter,
    setNumberFilter,
    setDateFilter,
    clearFilters,
    filteredRows,
    isFiltered,
  } = useTableFilter(projects, filterConfigs)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [projectData, neighborhoodData] = await Promise.all([
        getProjects(),
        getNeighborhoods(),
      ])
      setProjects(projectData)
      setNeighborhoods(neighborhoodData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function neighborhoodName(id: string): string {
    return neighborhoods.find((n) => n.id === id)?.name ?? '—'
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...filteredRows].sort(buildProjectComparator(sortField, sortDir, neighborhoodName))

  function handleAdd() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function handleRowClick(project: Project) {
    setEditing(project)
    setFormOpen(true)
  }

  function handleSaved() {
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Projects</Typography>
        <Button variant="contained" onClick={handleAdd}>
          Add Project
        </Button>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && projects.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary" mb={2}>
            No projects saved yet.
          </Typography>
          <Button variant="contained" onClick={handleAdd}>
            Add Project
          </Button>
        </Box>
      )}

      {!loading && !error && projects.length > 0 && (
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
          <Table stickyHeader>
            <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: 'grey.100', fontWeight: 600 } }}>
              <TableRow>
                <TableCell sortDirection={sortField === 'title' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'title'}
                    direction={sortField === 'title' ? sortDir : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'neighborhood_name' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'neighborhood_name'}
                    direction={sortField === 'neighborhood_name' ? sortDir : 'asc'}
                    onClick={() => handleSort('neighborhood_name')}
                  >
                    Neighborhood
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'current_stage' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'current_stage'}
                    direction={sortField === 'current_stage' ? sortDir : 'asc'}
                    onClick={() => handleSort('current_stage')}
                  >
                    Stage
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'price_sqm' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'price_sqm'}
                    direction={sortField === 'price_sqm' ? sortDir : 'asc'}
                    onClick={() => handleSort('price_sqm')}
                  >
                    Price / m²
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sortDirection={sortField === 'total_apartments' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'total_apartments'}
                    direction={sortField === 'total_apartments' ? sortDir : 'asc'}
                    onClick={() => handleSort('total_apartments')}
                  >
                    Units
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortField === 'completion_date' ? sortDir : false}>
                  <TableSortLabel
                    active={sortField === 'completion_date'}
                    direction={sortField === 'completion_date' ? sortDir : 'asc'}
                    onClick={() => handleSort('completion_date')}
                  >
                    Completion
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(p)}
                >
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{neighborhoodName(p.neighborhood_id)}</TableCell>
                  <TableCell>
                    {BUILDING_STAGE_LABELS[p.current_stage as BuildingStage] ?? p.current_stage}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(p.price_sqm, p.currency)}
                  </TableCell>
                  <TableCell align="right">{p.total_apartments ?? '—'}</TableCell>
                  <TableCell>{formatDate(p.completion_date)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ApartmentIcon />}
                        onClick={(e) => { e.stopPropagation(); router.push(`/projects/${p.id}/units`) }}
                      >
                        Units
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(p) }}
                        aria-label="edit project"
                        sx={{ color: 'grey.700' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                        aria-label="delete project"
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
        </>
      )}

      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        existing={editing}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete Project?"
        description={`Permanently delete "${deleteTarget?.title}"? This will also delete all units in this project. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Container>
  )
}
