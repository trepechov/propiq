'use client'

/**
 * SearchPreFilterPanel — collapsible project + unit filter panel for the Search page.
 *
 * Always renders a summary row (checkbox + counts + expand toggle).
 * Expands to show two TableFilterBar sections — one for projects, one for units
 * within those projects. Unit filter cascades automatically because
 * useTableFilter on the page receives project-scoped units as its rows prop.
 *
 * When dataLoading is true, controls are disabled and a skeleton count is shown.
 */

// no react imports needed — props-only component
import {
  Alert,
  Box,
  Checkbox,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import TableFilterBar from '@/components/TableFilterBar'
import type { FilterConfig, FilterState } from '@/hooks/useTableFilter'
import type { Project, Neighborhood } from '@/types'
import type { Unit } from '@/types/unit'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  // Toggle state
  preFilterEnabled: boolean
  onPreFilterEnabledChange: (enabled: boolean) => void

  // Project filter
  projectFilterConfigs: FilterConfig<Project>[]
  projectFilterState: FilterState
  onProjectTextChange: (text: string) => void
  onProjectEnumChange: (field: string, values: string[]) => void
  onProjectNumberChange: (field: string, value: string) => void
  onProjectDateChange: (field: string, value: string) => void
  onProjectClear: () => void
  isProjectFiltered: boolean

  // Unit filter
  unitFilterConfigs: FilterConfig<Unit>[]
  unitFilterState: FilterState
  onUnitTextChange: (text: string) => void
  onUnitEnumChange: (field: string, values: string[]) => void
  onUnitNumberChange: (field: string, value: string) => void
  onUnitDateChange: (field: string, value: string) => void
  onUnitClear: () => void
  isUnitFiltered: boolean

  // Counts + loading
  projectCount: number
  unitCount: number
  dataLoading: boolean

  // Expand (controlled by parent so checkbox can auto-expand)
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchPreFilterPanel({
  preFilterEnabled,
  onPreFilterEnabledChange,
  projectFilterConfigs,
  projectFilterState,
  onProjectTextChange,
  onProjectEnumChange,
  onProjectNumberChange,
  onProjectDateChange,
  onProjectClear,
  isProjectFiltered,
  unitFilterConfigs,
  unitFilterState,
  onUnitTextChange,
  onUnitEnumChange,
  onUnitNumberChange,
  onUnitDateChange,
  onUnitClear,
  isUnitFiltered,
  projectCount,
  unitCount,
  dataLoading,
  expanded,
  onExpandedChange,
}: Props) {
  return (
    <Box sx={{ mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      {/* Always-visible summary row */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <FormControlLabel
          control={
            <Checkbox
              checked={preFilterEnabled}
              onChange={(e) => onPreFilterEnabledChange(e.target.checked)}
              disabled={dataLoading}
              size="small"
            />
          }
          label="Enable pre-filter"
          sx={{ mr: 0 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {dataLoading ? (
            <Skeleton variant="text" width={120} sx={{ display: 'inline-block' }} />
          ) : (
            `${projectCount} project${projectCount !== 1 ? 's' : ''} · ${unitCount} unit${unitCount !== 1 ? 's' : ''}`
          )}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? 'Collapse pre-filter' : 'Expand pre-filter'}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>

      {/* Expandable filter controls */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Filter Projects
          </Typography>
          <TableFilterBar
            configs={projectFilterConfigs}
            filterState={projectFilterState}
            onTextChange={onProjectTextChange}
            onEnumChange={onProjectEnumChange}
            onNumberChange={onProjectNumberChange}
            onDateChange={onProjectDateChange}
            onClear={onProjectClear}
            isFiltered={isProjectFiltered}
          />

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Filter Units within those projects
          </Typography>
          <TableFilterBar
            configs={unitFilterConfigs}
            filterState={unitFilterState}
            onTextChange={onUnitTextChange}
            onEnumChange={onUnitEnumChange}
            onNumberChange={onUnitNumberChange}
            onDateChange={onUnitDateChange}
            onClear={onUnitClear}
            isFiltered={isUnitFiltered}
          />

          {preFilterEnabled && projectCount === 0 && !dataLoading && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              No projects match the current filters. Adjust filters or disable pre-filter.
            </Alert>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
