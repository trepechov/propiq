'use client'

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
import FeedbackWidget from '@/components/FeedbackWidget'
import { MatchType } from '@/types'
import type { MatchType as MatchTypeT, Project, Unit } from '@/types'
import type { ProjectPaymentScheme } from '@/types/projectPaymentScheme'

// ── Result types (mirrored from searchOpportunities — Phase 3 will use these) ─

export interface OpportunityResult {
  project: Project
  unit?: Unit
  reason: string
  score?: number
  /** All payment schemes for the project (default first, then optional). */
  schemes?: ProjectPaymentScheme[]
}

export interface SearchResult {
  matching: OpportunityResult[]
  nonMatching: OpportunityResult[]
  meta: {
    durationMs: number
    tokens: number
  }
}

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
  if (unit.floor           !== null) parts.push(`Floor ${unit.floor}`)
  if (unit.total_area      !== null) parts.push(formatArea(unit.total_area))
  if (unit.direction)                parts.push(unit.direction)
  if (unit.bedrooms        !== null) parts.push(`${unit.bedrooms} bed${unit.bedrooms !== 1 ? 's' : ''}`)
  if (unit.total_price_vat !== null) parts.push(formatPrice(unit.total_price_vat, project.currency))

  if (parts.length === 0) return null

  return (
    <Typography variant="body2" color="text.secondary">
      Unit: {parts.join(' · ')}
    </Typography>
  )
}

// ── Payment schemes display ───────────────────────────────────────────────────

interface PaymentSchemesDisplayProps {
  schemes: ProjectPaymentScheme[]
}

function PaymentSchemesDisplay({ schemes }: PaymentSchemesDisplayProps) {
  if (schemes.length === 0) return null

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        Payment Schemes
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {schemes.map((scheme) => (
          <SchemeChip key={scheme.id} scheme={scheme} />
        ))}
      </Stack>
    </Box>
  )
}

interface SchemeChipProps {
  scheme: ProjectPaymentScheme
}

function SchemeChip({ scheme }: SchemeChipProps) {
  if (scheme.is_default) {
    return (
      <Chip
        label={`${scheme.name} (default)`}
        size="small"
        variant="outlined"
        color="default"
      />
    )
  }

  const modifier = scheme.price_modifier_sqm
  const modifierLabel =
    modifier > 0
      ? `+${modifier} EUR/m²`
      : modifier < 0
        ? `−${Math.abs(modifier)} EUR/m²`
        : null

  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      <Chip
        label={scheme.name}
        size="small"
        variant="outlined"
        color="primary"
      />
      {modifierLabel !== null && (
        <Typography
          variant="caption"
          color={modifier > 0 ? 'error.main' : 'success.main'}
          fontWeight={600}
        >
          {modifierLabel}
        </Typography>
      )}
    </Stack>
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

          {/* Payment schemes */}
          {result.schemes && result.schemes.length > 0 && (
            <PaymentSchemesDisplay schemes={result.schemes} />
          )}

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
              key={`${matchType}-${r.project.id}-${r.unit?.id ?? 'none'}`}
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
