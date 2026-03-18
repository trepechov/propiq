/**
 * Projects listing page — displays all saved projects in a table.
 * Users can add new projects or edit existing ones via a dialog.
 * Each row links to the Units screen for that project.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { getProjects } from '../services/projects'
import { getNeighborhoods } from '../services/neighborhoods'
import type { Project, Neighborhood } from '../types'
import ProjectForm from '../components/ProjectForm'
import { BUILDING_STAGE_LABELS } from '../config/domain'
import type { BuildingStage } from '../config/domain'

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
  const navigate = useNavigate()

  const [projects, setProjects]         = useState<Project[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [formOpen, setFormOpen]         = useState(false)
  const [editing, setEditing]           = useState<Project | undefined>(undefined)

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
        <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Neighborhood</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align="right">Price / m²</TableCell>
                <TableCell align="right">Units</TableCell>
                <TableCell>Completion</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((p) => (
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
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(p) }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}/units`) }}
                      >
                        Units
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        existing={editing}
      />
    </Container>
  )
}
