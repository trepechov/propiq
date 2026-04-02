/**
 * Server-side Supabase query functions for use in Route Handlers.
 *
 * Uses the server client (lib/supabase/server.ts) which carries the user's
 * session cookie, ensuring RLS policies see the authenticated user's JWT.
 *
 * DO NOT use the browser client (lib/supabase/client.ts) in Route Handlers —
 * it has no session context and RLS will block all queries.
 */

import { createClient } from './server'
import type { Project } from '../../types/project'
import type { Unit } from '../../types/unit'
import type { SearchFeedback } from '../../types/searchFeedback'
import type { ProjectPaymentScheme } from '../../types/projectPaymentScheme'

/**
 * Bulk query: returns a map of project_id → default scheme name
 * for a list of project ids. Single query with IN clause — no N+1 queries.
 *
 * Used by the projects list page to populate the "Default Scheme" column.
 * Projects without a default scheme are absent from the returned map.
 */
export async function getDefaultSchemeNamesServer(
  projectIds: string[],
): Promise<Record<string, string>> {
  if (projectIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .select('project_id, name')
    .in('project_id', projectIds)
    .eq('is_default', true)

  if (error) throw new Error(`getDefaultSchemeNamesServer failed: ${error.message}`)
  return Object.fromEntries(data.map((row) => [row.project_id, row.name]))
}

/**
 * Returns all payment schemes for a list of project IDs, grouped by project_id.
 * Used by the search route to inject scheme context into the AI prompt.
 *
 * Ordered default-first, then by name — so the default scheme appears first
 * in prompt context and optional alternatives follow in predictable order.
 */
export async function getAllSchemesByProjectServer(
  projectIds: string[],
): Promise<Record<string, ProjectPaymentScheme[]>> {
  if (projectIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .select('*')
    .in('project_id', projectIds)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) throw new Error(`getAllSchemesByProjectServer failed: ${error.message}`)

  const map: Record<string, ProjectPaymentScheme[]> = {}
  for (const scheme of data) {
    if (!map[scheme.project_id]) map[scheme.project_id] = []
    map[scheme.project_id].push(scheme)
  }
  return map
}

/** Returns all projects ordered by title. */
export async function getProjectsServer(): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('title')

  if (error) throw new Error(`getProjectsServer failed: ${error.message}`)
  return data
}

/**
 * Returns all units across all projects.
 *
 * The search Route Handler needs all units to build lookup maps
 * for filtering available units per project. No project filter is applied
 * here — filtering by status happens in the caller.
 */
export async function getUnitsServer(): Promise<Unit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('floor')
    .order('apartment_number')

  if (error) throw new Error(`getUnitsServer failed: ${error.message}`)
  return data.sort((a, b) =>
    (a.apartment_number ?? a.identifier ?? '').localeCompare(
      b.apartment_number ?? b.identifier ?? '',
      undefined,
      { numeric: true },
    )
  )
}

/**
 * Returns the most recent feedback rows, ordered by creation date descending.
 *
 * Used by the search Route Handler to inject past user signals into the
 * Gemini prompt so results reflect prior feedback over time.
 *
 * @param limit - Max rows to fetch (default 100)
 */
export async function getSearchFeedbackServer(limit = 100): Promise<SearchFeedback[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('search_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getSearchFeedbackServer failed: ${error.message}`)
  return data
}
