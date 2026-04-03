'use client'

/**
 * Opportunity Search page — /search
 *
 * User types a natural language query describing their investment criteria.
 * Gemini evaluates stored projects + available units against the query and
 * returns matching and non-matching opportunities.
 *
 * Pre-filter panel (collapsed by default): users can narrow the project/unit
 * dataset before the AI sees it. When pre-filter is disabled, all data is sent
 * (legacy behaviour preserved). When enabled, only filtered IDs are sent to
 * the route handler; the server re-enforces AVAILABLE status independently.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { ResultsColumn, MatchType } from './SearchPage.helpers'
import type { SearchResult } from './SearchPage.helpers'
import SearchPreFilterPanel from './SearchPreFilterPanel'
import {
  buildSearchProjectFilterConfigs,
  SEARCH_UNIT_FILTER_CONFIGS,
} from './SearchPage.filterConfigs'
import { useTableFilter } from '@/hooks/useTableFilter'
import { getProjects } from '@/lib/supabase/projects'
import { getAllUnits } from '@/lib/supabase/units'
import { getNeighborhoods } from '@/lib/supabase/neighborhoods'
import type { Project, Neighborhood } from '@/types'
import type { Unit } from '@/types/unit'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

// ── Page component ────────────────────────────────────────────────────────────

export default function SearchPage() {
  // ── Query state ─────────────────────────────────────────────────────────────
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [notice,  setNotice]  = useState<string | null>(null)
  const [result,  setResult]  = useState<SearchResult | null>(null)

  // ── Pre-filter data state ────────────────────────────────────────────────────
  const [allProjects,    setAllProjects]    = useState<Project[]>([])
  const [allUnits,       setAllUnits]       = useState<Unit[]>([])
  const [neighborhoods,  setNeighborhoods]  = useState<Neighborhood[]>([])
  const [dataLoading,    setDataLoading]    = useState(true)
  const [preFilterEnabled, setPreFilterEnabled] = useState(false)
  const [filterExpanded, setFilterExpanded] = useState(false)

  function handlePreFilterEnabledChange(enabled: boolean) {
    setPreFilterEnabled(enabled)
    if (enabled) setFilterExpanded(true)
  }

  // ── Load data on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getProjects(), getAllUnits(), getNeighborhoods()])
      .then(([projects, units, hoods]) => {
        setAllProjects(projects)
        setAllUnits(units)
        setNeighborhoods(hoods)
      })
      .catch(() => {
        // Non-fatal — pre-filter simply won't populate; search still works
      })
      .finally(() => setDataLoading(false))
  }, [])

  // ── Project filter ───────────────────────────────────────────────────────────
  const projectFilterConfigs = useMemo(
    () => buildSearchProjectFilterConfigs(neighborhoods),
    [neighborhoods],
  )

  const {
    filterState:    projectFilterState,
    setTextFilter:  setProjectText,
    setEnumFilter:  setProjectEnum,
    setNumberFilter: setProjectNumber,
    setDateFilter:  setProjectDate,
    clearFilters:   clearProjectFilters,
    isFiltered:     isProjectFiltered,
    filteredRows:   filteredProjects,
  } = useTableFilter(allProjects, projectFilterConfigs)

  // ── Unit filter (cascades within project-filtered set) ───────────────────────
  const projectFilteredUnits = useMemo(() => {
    const projectIdSet = new Set(filteredProjects.map((p) => p.id))
    return allUnits.filter((u) => projectIdSet.has(u.project_id))
  }, [filteredProjects, allUnits])

  const {
    filterState:    unitFilterState,
    setTextFilter:  setUnitText,
    setEnumFilter:  setUnitEnum,
    setNumberFilter: setUnitNumber,
    setDateFilter:  setUnitDate,
    clearFilters:   clearUnitFilters,
    isFiltered:     isUnitFiltered,
    filteredRows:   filteredUnits,
  } = useTableFilter(projectFilteredUnits, SEARCH_UNIT_FILTER_CONFIGS)

  // ── Search handler ───────────────────────────────────────────────────────────
  async function handleSearch() {
    const trimmed = query.trim()
    if (!trimmed) return

    // Guard: pre-filter enabled but no projects pass the filter
    if (preFilterEnabled && filteredProjects.length === 0) {
      setError('Pre-filter matches no projects. Adjust filters or disable pre-filter.')
      return
    }

    setLoading(true)
    setError(null)
    setNotice(null)
    setResult(null)

    try {
      const body: Record<string, unknown> = { query: trimmed }
      if (preFilterEnabled) {
        body.projectIds = filteredProjects.map((p) => p.id)
        body.unitIds    = filteredUnits.map((u) => u.id)
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const responseBody = await response.json().catch(() => ({}))
        const msg = responseBody?.error ?? 'Search is not yet available'
        if (response.status === 501) {
          setNotice(msg)
        } else {
          setError(msg)
        }
        return
      }

      const searchResult = await response.json()
      setResult(searchResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSearch()
    }
  }

  // ── Stats bar meta text ──────────────────────────────────────────────────────
  function buildStatsText(): string {
    if (!result) return ''
    const base = `${formatDuration(result.meta.durationMs)} · ${result.meta.tokens.toLocaleString()} tokens · ${result.matching.length} matching, ${result.nonMatching.length} non-matching`
    if (preFilterEnabled) {
      return `${base} · Pre-filtered: ${filteredProjects.length} projects, ${filteredUnits.length} units`
    }
    return base
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page header */}
      <Typography variant="h5" mb={3}>
        Opportunity Search
      </Typography>

      {/* Pre-filter panel */}
      <SearchPreFilterPanel
        preFilterEnabled={preFilterEnabled}
        onPreFilterEnabledChange={handlePreFilterEnabledChange}
        expanded={filterExpanded}
        onExpandedChange={setFilterExpanded}
        projectFilterConfigs={projectFilterConfigs}
        projectFilterState={projectFilterState}
        onProjectTextChange={setProjectText}
        onProjectEnumChange={setProjectEnum}
        onProjectNumberChange={setProjectNumber}
        onProjectDateChange={setProjectDate}
        onProjectClear={clearProjectFilters}
        isProjectFiltered={isProjectFiltered}
        unitFilterConfigs={SEARCH_UNIT_FILTER_CONFIGS}
        unitFilterState={unitFilterState}
        onUnitTextChange={setUnitText}
        onUnitEnumChange={setUnitEnum}
        onUnitNumberChange={setUnitNumber}
        onUnitDateChange={setUnitDate}
        onUnitClear={clearUnitFilters}
        isUnitFiltered={isUnitFiltered}
        projectCount={filteredProjects.length}
        unitCount={filteredUnits.length}
        dataLoading={dataLoading}
      />

      {/* Query input + search button */}
      <Stack spacing={1.5} mb={3}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder='Describe what you are looking for — e.g. "2-bed apartment, south facing, under 120k EUR, good yield, low risk stage"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button
          variant="contained"
          size="large"
          onClick={handleSearch}
          disabled={loading || query.trim().length === 0}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
          sx={{ alignSelf: 'flex-start', px: 4 }}
        >
          {loading ? 'Searching…' : 'Find Opportunities'}
        </Button>
      </Stack>

      {notice && <Alert severity="info" sx={{ mb: 2 }}>{notice}</Alert>}
      {error  && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats bar */}
      {result && !loading && (
        <Alert severity="info" sx={{ py: 0, mb: 2 }}>
          {buildStatsText()}
        </Alert>
      )}

      {/* Results */}
      {result && !loading && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems="flex-start"
        >
          <ResultsColumn
            title="Matching"
            results={result.matching}
            matchType={MatchType.MATCHING}
            queryText={query.trim()}
            color="success.main"
          />
          <ResultsColumn
            title="Does Not Match"
            results={result.nonMatching}
            matchType={MatchType.NON_MATCHING}
            queryText={query.trim()}
            color="warning.main"
          />
        </Stack>
      )}

      {/* Empty state before first search */}
      {!result && !loading && !error && (
        <Box textAlign="center" py={10}>
          <Typography color="text.secondary">
            Describe what you are looking for and click <strong>Find Opportunities</strong>.
          </Typography>
          <Typography variant="caption" color="text.disabled" mt={1} display="block">
            Tip: include budget, preferred stage, orientation, or yield targets.
          </Typography>
        </Box>
      )}
    </Container>
  )
}
