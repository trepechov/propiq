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
  return data
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
