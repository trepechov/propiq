/**
 * POST /api/search
 *
 * Opportunity search Route Handler.
 *
 * Loads all projects + units from Supabase using the server client (RLS-safe),
 * builds a token-efficient context block, and uses Gemini to rank results
 * against investment criteria + the user's natural language query.
 *
 * Returns:
 *   200 SearchResult { matching: OpportunityResult[]; nonMatching: OpportunityResult[]; meta: ExtractionMeta }
 *   400 { error: string }   — missing query
 *   401 { error: string }   — unauthenticated
 *   422 { error: string }   — AI response validation failed
 *   500 { error: string }   — unexpected error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { structuredExtract } from '@/lib/ai/server'
import {
  buildContextBlock,
  buildFeedbackContext,
  rawSearchResultSchema,
  resolveResult,
  SEARCH_RESPONSE_SHAPE_INSTRUCTIONS,
  type OpportunityResult,
  type SearchResult,
} from '@/lib/ai/searchHelpers'
import {
  getAllSchemesByProjectServer,
  getProjectsServer,
  getUnitsServer,
  getSearchFeedbackServer,
} from '@/lib/supabase/server-queries'
import { QUERY_CONTEXT } from '@/prompts/queryContext'
import { EVALUATION_CRITERIA } from '@/prompts/evaluationCriteria'
import { getUserCriteria } from '@/lib/supabase/userCriteria'
import { UnitStatus } from '@/config/domain'
import type { Project } from '@/types/project'
import type { Unit } from '@/types/unit'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let query: string
  try {
    const body = await request.json()
    query = body?.query
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    // Load data in parallel using server client (RLS-safe)
    const [projects, allUnits, feedback, queryContext, evaluationCriteria] = await Promise.all([
      getProjectsServer(),
      getUnitsServer(),
      getSearchFeedbackServer(),
      getUserCriteria(supabase, user.id, 'query_context', QUERY_CONTEXT),
      getUserCriteria(supabase, user.id, 'evaluation_criteria', EVALUATION_CRITERIA),
    ])

    // Fetch all schemes for context — done after projects so we have their IDs.
    // Separate from the parallel block above to avoid the chicken-and-egg problem.
    const schemesByProject = await getAllSchemesByProjectServer(projects.map((p) => p.id))

    // Build lookup maps
    const projectMap = buildProjectMap(projects)
    const { unitsByProject, unitMap } = buildUnitMaps(projects, allUnits)

    // Build prompt
    const contextBlock    = buildContextBlock(projects, unitsByProject, schemesByProject)
    const feedbackContext = buildFeedbackContext(feedback, projects)

    const prompt = [
      queryContext,
      evaluationCriteria,
      contextBlock + feedbackContext,
      `## User Query\n\n${query}`,
      SEARCH_RESPONSE_SHAPE_INSTRUCTIONS,
    ].join('\n\n')

    // Call Gemini
    const { json, meta } = await structuredExtract(prompt)

    // Parse + validate
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON for opportunity search' },
        { status: 422 },
      )
    }

    const validation = rawSearchResultSchema.safeParse(parsed)
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
      return NextResponse.json(
        { error: `Opportunity search response validation failed: ${issues}` },
        { status: 422 },
      )
    }

    // Resolve UUIDs to full objects, attaching scheme data to each result
    const matching = validation.data.matching
      .map((r) => resolveResult(r, projectMap, unitMap, schemesByProject))
      .filter((r): r is OpportunityResult => r !== null)

    const nonMatching = validation.data.nonMatching
      .map((r) => resolveResult(r, projectMap, unitMap, schemesByProject))
      .filter((r): r is OpportunityResult => r !== null)

    return NextResponse.json({ matching, nonMatching, meta } satisfies SearchResult)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function buildProjectMap(projects: Project[]): Map<string, Project> {
  return new Map(projects.map((p) => [p.id, p]))
}

function buildUnitMaps(
  projects: Project[],
  allUnits: Unit[],
): { unitsByProject: Map<string, Unit[]>; unitMap: Map<string, Unit> } {
  // Group all units by project_id
  const unitsByProject = new Map<string, Unit[]>()
  const unitMap = new Map<string, Unit>()

  // Initialise empty arrays for every project (handles projects with no units)
  for (const p of projects) {
    unitsByProject.set(p.id, [])
  }

  for (const unit of allUnits) {
    if (unit.status === UnitStatus.AVAILABLE) {
      const existing = unitsByProject.get(unit.project_id) ?? []
      existing.push(unit)
      unitsByProject.set(unit.project_id, existing)
      unitMap.set(unit.id, unit)
    }
  }

  return { unitsByProject, unitMap }
}
