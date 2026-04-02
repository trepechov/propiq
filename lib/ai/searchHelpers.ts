/**
 * Pure helper functions for the opportunity search route handler.
 *
 * No Supabase or AI dependencies — safe to import from client components
 * that only need the OpportunityResult / SearchResult types.
 *
 * Ported from src/services/searchOpportunities.ts (pure helpers only).
 */

import { z } from 'zod'
import { FeedbackRating } from '../../types/searchFeedback'
import type { Project } from '../../types/project'
import type { Unit } from '../../types/unit'
import type { SearchFeedback } from '../../types/searchFeedback'
import type { ProjectPaymentScheme } from '../../types/projectPaymentScheme'
import type { ExtractionMeta } from './types'

// ── Result types ──────────────────────────────────────────────────────────────

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
  meta: ExtractionMeta
}

// ── Zod schema for raw Gemini response ───────────────────────────────────────

export const rawOpportunitySchema = z.object({
  project_id: z.string(),
  unit_id:    z.string().nullable().default(null),
  reason:     z.string(),
  score:      z.number().nullable().default(null),
})

export const rawSearchResultSchema = z.object({
  matching:    z.array(rawOpportunitySchema),
  nonMatching: z.array(rawOpportunitySchema),
})

// ── Response shape instructions (injected into the prompt) ───────────────────

export const SEARCH_RESPONSE_SHAPE_INSTRUCTIONS = `
### Response Format
Return a single JSON object with exactly this shape:
{
  "matching": [array of up to 5 OpportunityResult objects],
  "nonMatching": [array of up to 5 OpportunityResult objects]
}

Each OpportunityResult must have EXACTLY these fields:
  project_id (string — UUID of the project),
  unit_id (string or null — UUID of a specific unit if relevant),
  reason (string — 2-3 sentences explaining the match or mismatch),
  score (number 1-10 or null)
`

// ── Context builders ──────────────────────────────────────────────────────────

/**
 * Maps a raw installment trigger code to a human-readable label.
 * Trigger values come from the DB (e.g. "act16") and must be readable
 * to the AI so it can reason about payment timing and investor appeal.
 */
function formatTrigger(trigger: string): string {
  const TRIGGER_LABELS: Record<string, string> = {
    signing: 'signing',
    act14:   'Act 14',
    act15:   'Act 15',
    act16:   'Act 16',
  }
  return TRIGGER_LABELS[trigger] ?? trigger
}

/**
 * Formats a single scheme's installments as a compact summary.
 * Example: "20% signing → 30% Act 14 → 50% Act 16"
 */
function formatInstallmentSummary(scheme: ProjectPaymentScheme): string {
  return scheme.installments
    .map((i) => `${i.percentage}% ${formatTrigger(i.trigger)}`)
    .join(' → ')
}

/**
 * Formats the price modifier badge for non-default schemes.
 * Positive modifier = premium on top of base price.
 * Negative modifier = discount off base price.
 */
function formatModifier(scheme: ProjectPaymentScheme): string {
  if (scheme.price_modifier_sqm === 0) return ''
  const abs = Math.abs(scheme.price_modifier_sqm)
  return scheme.price_modifier_sqm > 0
    ? ` (+${abs} EUR/m² on top of base)`
    : ` (−${abs} EUR/m² discount)`
}

/**
 * Builds the Payment Schemes block for a project's AI context entry.
 * Shows all schemes so the AI can reason about payment flexibility —
 * e.g. a project with a 20-80 optional scheme is more investor-friendly
 * than one with only a 90-10 scheme.
 */
function buildSchemesBlock(schemes: ProjectPaymentScheme[]): string {
  if (schemes.length === 0) return ''
  const lines = schemes.map((s) => {
    const tag      = s.is_default ? '[DEFAULT]' : '[OPTIONAL]'
    const summary  = formatInstallmentSummary(s)
    const modifier = formatModifier(s)
    return `  • ${s.name} ${tag} — ${summary}${modifier}`
  })
  return `Payment Schemes:\n${lines.join('\n')}`
}

/** Returns a compact text summary for one project + its available units. */
export function buildProjectContext(
  project: Project,
  availableUnits: Unit[],
  schemes: ProjectPaymentScheme[] = [],
): string {
  const header = project.ai_summary
    ? `### ${project.title} (ID: ${project.id})\n${project.ai_summary}`
    : [
        `### ${project.title} (ID: ${project.id})`,
        project.developer      ? `Developer: ${project.developer}` : null,
        `Stage: ${project.current_stage}`,
        project.price_sqm      ? `Price/m²: ${project.price_sqm} ${project.currency ?? ''}` : null,
        project.completion_date ? `Completion: ${project.completion_date}` : null,
      ]
        .filter(Boolean)
        .join('\n')

  const schemesBlock = buildSchemesBlock(schemes)

  if (availableUnits.length === 0) {
    return [header, schemesBlock, 'Available units: 0'].filter(Boolean).join('\n')
  }

  const prices = availableUnits
    .map((u) => u.total_price_vat)
    .filter((p): p is number => p !== null)

  const priceRange =
    prices.length > 0
      ? `${Math.min(...prices).toLocaleString()}–${Math.max(...prices).toLocaleString()} ${project.currency ?? ''}`
      : 'price unknown'

  const unitLines = availableUnits.slice(0, 10).map((u) =>
    [
      `  - Unit ${u.apartment_number ?? u.identifier ?? u.id}`,
      u.floor          !== null ? `floor ${u.floor}` : null,
      u.total_area     !== null ? `${u.total_area} m²` : null,
      u.direction                ? u.direction : null,
      u.total_price_vat !== null ? `${u.total_price_vat.toLocaleString()} ${project.currency ?? ''}` : null,
      `(ID: ${u.id})`,
    ]
      .filter(Boolean)
      .join(', '),
  )

  const moreNote =
    availableUnits.length > 10
      ? `  ... and ${availableUnits.length - 10} more available units`
      : null

  return [
    header,
    ...(schemesBlock ? [schemesBlock] : []),
    `Available units: ${availableUnits.length}, price range: ${priceRange}`,
    ...unitLines,
    ...(moreNote ? [moreNote] : []),
  ].join('\n')
}

/** Builds the full context block from all projects, units, and payment schemes. */
export function buildContextBlock(
  projects: Project[],
  unitsByProject: Map<string, Unit[]>,
  schemesByProject: Record<string, ProjectPaymentScheme[]> = {},
): string {
  const sections = projects.map((p) =>
    buildProjectContext(p, unitsByProject.get(p.id) ?? [], schemesByProject[p.id] ?? []),
  )
  return `## Available Projects and Units\n\n${sections.join('\n\n')}`
}

// ── Feedback context builder ──────────────────────────────────────────────────

const MAX_NOTES_PER_PROJECT = 2

/** Builds a compact feedback summary block to inject into the Gemini prompt. */
export function buildFeedbackContext(
  feedback: SearchFeedback[],
  projects: Project[],
): string {
  if (feedback.length === 0) return ''

  const titleById = new Map<string, string>(projects.map((p) => [p.id, p.title]))

  const byProject = new Map<string, SearchFeedback[]>()
  for (const row of feedback) {
    const existing = byProject.get(row.result_project_id) ?? []
    existing.push(row)
    byProject.set(row.result_project_id, existing)
  }

  const lines: string[] = []

  for (const [projectId, rows] of byProject) {
    const title = titleById.get(projectId) ?? projectId
    const upCount   = rows.filter((r) => r.rating === FeedbackRating.UP).length
    const downCount = rows.filter((r) => r.rating === FeedbackRating.DOWN).length
    const notes = rows
      .map((r) => r.note)
      .filter((n): n is string => n !== null)
      .slice(0, MAX_NOTES_PER_PROJECT)
    const notePart = notes.length > 0 ? `. Notes: ${notes.join('; ')}` : ''
    lines.push(`• ${title}: ${upCount}↑ ${downCount}↓${notePart}`)
  }

  return `\n### Past User Feedback\n${lines.join('\n')}`
}

// ── Result resolver ───────────────────────────────────────────────────────────

/** Resolves raw Gemini UUIDs into full Project, Unit, and scheme objects. */
export function resolveResult(
  raw: z.infer<typeof rawOpportunitySchema>,
  projectMap: Map<string, Project>,
  unitMap: Map<string, Unit>,
  schemesByProject: Record<string, ProjectPaymentScheme[]> = {},
): OpportunityResult | null {
  const project = projectMap.get(raw.project_id)
  if (!project) return null

  const schemes = schemesByProject[raw.project_id]

  const result: OpportunityResult = {
    project,
    reason: raw.reason,
    ...(raw.score  !== null      ? { score:   raw.score } : {}),
    ...(schemes?.length          ? { schemes }             : {}),
  }

  if (raw.unit_id) {
    const unit = unitMap.get(raw.unit_id)
    if (unit) result.unit = unit
  }

  return result
}
