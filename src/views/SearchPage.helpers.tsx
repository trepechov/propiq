/**
 * Card sub-components for the Search page.
 *
 * Extracted here to keep SearchPage.tsx within the 300-line limit.
 * Each component renders one opportunity result card with project/unit
 * details, score badge, reason text, and the feedback widget.
 */

import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import FeedbackWidget from '../components/FeedbackWidget'
import { MatchType } from '../types/searchFeedback'
import type { MatchType as MatchTypeT } from '../types/searchFeedback'
import type { OpportunityResult } from '../services/searchOpportunities'

// ── Formatters ────────────────────────────────────────────────────────────────

function formatPrice(value: number | null, currency: string | null): string {
  if (value === null) return '—'
  return `${value.toLocaleString()} ${currency ?? ''}`.trim()
}

function formatArea(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)} m²`
}

// ── Unit summary line ─────────────────────────────────────────────────────────

interface UnitSummaryProps {
  result: OpportunityResult
}

function UnitSummary({ result }: UnitSummaryProps) {
  const { unit, project } = result
  if (!unit) return null

  const parts: string[] = []
  if (unit.floor          !== null) parts.push(`Floor ${unit.floor}`)
  if (unit.total_area     !== null) parts.push(formatArea(unit.total_area))
  if (unit.direction)               parts.push(unit.direction)
  if (unit.total_price_vat !== null) parts.push(formatPrice(unit.total_price_vat, project.currency))

  if (parts.length === 0) return null

  return (
    <Typography variant="body2" color="text.secondary">
      Unit: {parts.join(' · ')}
    </Typography>
  )
}

// ── Opportunity card ──────────────────────────────────────────────────────────

interface OpportunityCardProps {
  result:    OpportunityResult
  matchType: MatchTypeT
  queryText: string
}

export function OpportunityCard({ result, matchType, queryText }: OpportunityCardProps) {
  const { project, score, reason } = result

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack spacing={0.75}>
          {/* Header row: title + score badge */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1, mr: 1 }}>
              {project.title}
            </Typography>
            {score !== undefined && (
              <Chip
                label={`Score: ${score}/10`}
                size="small"
                color={score >= 7 ? 'success' : score >= 4 ? 'warning' : 'error'}
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
            )}
          </Stack>

          {/* Project meta */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Stage: {project.current_stage}
              {project.price_sqm !== null
                ? ` · ${project.price_sqm.toLocaleString()} ${project.currency ?? ''}/m²`.trim()
                : ''}
            </Typography>
          </Box>

          {/* Unit info (if applicable) */}
          <UnitSummary result={result} />

          {/* Reason */}
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {reason}
          </Typography>

          {/* Feedback widget */}
          <FeedbackWidget
            projectId={project.id}
            unitId={result.unit?.id}
            matchType={matchType}
            queryText={queryText}
          />
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Results column ────────────────────────────────────────────────────────────

interface ResultsColumnProps {
  title:     string
  results:   OpportunityResult[]
  matchType: MatchTypeT
  queryText: string
  color:     'success.main' | 'warning.main'
}

export function ResultsColumn({
  title,
  results,
  matchType,
  queryText,
  color,
}: ResultsColumnProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="subtitle1"
        fontWeight={700}
        color={color}
        mb={1.5}
      >
        {title} ({results.length})
      </Typography>
      {results.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No results in this category.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {results.map((r) => (
            <OpportunityCard
              key={`${r.project.id}-${r.unit?.id ?? 'project'}`}
              result={r}
              matchType={matchType}
              queryText={queryText}
            />
          ))}
        </Stack>
      )}
    </Box>
  )
}

// Re-export MatchType so SearchPage can import from one place
export { MatchType }
