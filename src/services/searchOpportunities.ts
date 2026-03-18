/**
 * Opportunity search service.
 *
 * Loads all projects and their available units from Supabase, sends them to
 * Gemini with investment criteria + the user's natural language query, and
 * parses the structured response into matching / non-matching result lists.
 *
 * Tokens are kept low by preferring `ai_summary` over full project fields.
 */

import { z } from 'zod'
import { getAIProvider } from './ai/provider'
import { getProjects } from './projects'
import { getUnits } from './units'
import { getSearchFeedback } from './searchFeedback'
import { EVALUATION_CRITERIA } from '../prompts/evaluationCriteria'
import { QUERY_CONTEXT } from '../prompts/queryContext'
import { UnitStatus } from '../config/domain'
import { FeedbackRating } from '../types/searchFeedback'
import type { Project } from '../types/project'
import type { Unit } from '../types/unit'
import type { ExtractionMeta } from './ai/types'
import type { SearchFeedback } from '../types/searchFeedback'

// ── Result types ──────────────────────────────────────────────────────────────

export interface OpportunityResult {
  project: Project
  unit?: Unit
  reason: string
  score?: number
}

export interface SearchResult {
  matching: OpportunityResult[]
  nonMatching: OpportunityResult[]
  meta: ExtractionMeta
}

// ── Zod schema for raw Gemini response ───────────────────────────────────────

const rawOpportunitySchema = z.object({
  project_id: z.string(),
  unit_id:    z.string().nullable().default(null),
  reason:     z.string(),
  score:      z.number().nullable().default(null),
})

const rawSearchResultSchema = z.object({
  matching:    z.array(rawOpportunitySchema),
  nonMatching: z.array(rawOpportunitySchema),
})

// ── Response shape instructions (injected into the prompt) ───────────────────

const RESPONSE_SHAPE_INSTRUCTIONS = `
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

/** Returns a compact text summary for one project + its available units. */
function buildProjectContext(
  project: Project,
  availableUnits: Unit[],
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

  if (availableUnits.length === 0) {
    return `${header}\nAvailable units: 0`
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
    `Available units: ${availableUnits.length}, price range: ${priceRange}`,
    ...unitLines,
    ...(moreNote ? [moreNote] : []),
  ].join('\n')
}

/** Builds the full context block sent to Gemini from all projects + units. */
function buildContextBlock(
  projects: Project[],
  unitsByProject: Map<string, Unit[]>,
): string {
  const sections = projects.map((p) =>
    buildProjectContext(p, unitsByProject.get(p.id) ?? []),
  )

  return `## Available Projects and Units\n\n${sections.join('\n\n')}`
}

// ── Feedback context builder ──────────────────────────────────────────────────

const MAX_NOTES_PER_PROJECT = 2

/**
 * Builds a compact feedback summary block to inject into the Gemini prompt.
 *
 * Groups past feedback rows by project and produces one line per project:
 *   "• [Title]: N↑ M↓[. Notes: note1; note2]"
 *
 * This lets Gemini factor in prior user reactions without repeating full
 * project details. Returns empty string when there are no feedback rows.
 *
 * @param feedback - Past feedback rows ordered newest-first
 * @param projects - Full project list used to resolve titles from IDs
 */
export function buildFeedbackContext(
  feedback: SearchFeedback[],
  projects: Project[],
): string {
  if (feedback.length === 0) return ''

  const titleById = new Map<string, string>(projects.map((p) => [p.id, p.title]))

  // Group rows by project id
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

/** Resolves raw Gemini UUIDs into full Project and Unit objects via Map lookup. */
function resolveResult(
  raw: z.infer<typeof rawOpportunitySchema>,
  projectMap: Map<string, Project>,
  unitMap: Map<string, Unit>,
): OpportunityResult | null {
  const project = projectMap.get(raw.project_id)
  if (!project) return null

  const result: OpportunityResult = {
    project,
    reason: raw.reason,
    ...(raw.score !== null ? { score: raw.score } : {}),
  }

  if (raw.unit_id) {
    const unit = unitMap.get(raw.unit_id)
    if (unit) result.unit = unit
  }

  return result
}

// ── Main service ──────────────────────────────────────────────────────────────

/**
 * Searches for opportunities matching the user's natural language query.
 *
 * Loads all projects and available units, builds a token-efficient context
 * block, and uses Gemini to rank results against investment criteria.
 *
 * @param query - Free-form search text from the user
 * @returns Matched and non-matched results with AI meta
 * @throws If Supabase loading fails, Gemini fails, or JSON parsing fails
 */
export async function searchOpportunities(query: string): Promise<SearchResult> {
  // 1. Load data in parallel
  const [projects, feedback] = await Promise.all([
    getProjects(),
    getSearchFeedback(),
  ])

  const unitArrays = await Promise.all(
    projects.map((p) => getUnits(p.id)),
  )

  // 2. Build lookup maps
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]))

  const unitMap = new Map<string, Unit>()
  const unitsByProject = new Map<string, Unit[]>()

  projects.forEach((p, i) => {
    const available = unitArrays[i].filter(
      (u) => u.status === UnitStatus.AVAILABLE,
    )
    unitsByProject.set(p.id, available)
    available.forEach((u) => unitMap.set(u.id, u))
  })

  // 3. Build prompt
  const contextBlock    = buildContextBlock(projects, unitsByProject)
  const feedbackContext = buildFeedbackContext(feedback, projects)

  const promptParts = [
    QUERY_CONTEXT,
    EVALUATION_CRITERIA,
    contextBlock + feedbackContext,
    `## User Query\n\n${query}`,
    RESPONSE_SHAPE_INSTRUCTIONS,
  ]

  const prompt = promptParts.join('\n\n')

  // 4. Call AI
  const { json, meta } = await getAIProvider().structuredExtract({ prompt })

  // 5. Parse + validate
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Gemini returned invalid JSON for opportunity search')
  }

  const validation = rawSearchResultSchema.safeParse(parsed)
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Opportunity search response validation failed: ${issues}`)
  }

  // 6. Resolve UUIDs to full objects
  const matching = validation.data.matching
    .map((r) => resolveResult(r, projectMap, unitMap))
    .filter((r): r is OpportunityResult => r !== null)

  const nonMatching = validation.data.nonMatching
    .map((r) => resolveResult(r, projectMap, unitMap))
    .filter((r): r is OpportunityResult => r !== null)

  return { matching, nonMatching, meta }
}
