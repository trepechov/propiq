/**
 * Supabase CRUD helpers for the `project_payment_schemes` table.
 *
 * Each project has exactly one default scheme (is_default = true) plus
 * optional alternative schemes with signed flat €/m² price modifiers.
 *
 * All functions throw on error — callers are responsible for handling failures.
 * No silent failures: every Supabase error surfaces immediately.
 */

import { createClient } from './client'
import type {
  ProjectPaymentScheme,
  ProjectPaymentSchemeInsert,
} from '../../types/projectPaymentScheme'

/**
 * Returns all payment schemes for a project, default scheme first,
 * then alphabetically by name.
 */
export async function getPaymentSchemes(
  projectId: string,
): Promise<ProjectPaymentScheme[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .select('*')
    .eq('project_id', projectId)
    .order('is_default', { ascending: false })
    .order('name')

  if (error) throw new Error(`getPaymentSchemes failed: ${error.message}`)
  return data
}

/**
 * Returns the default scheme for a project, or null if none exists.
 * There is at most one default per project (enforced by partial unique index).
 */
export async function getDefaultPaymentScheme(
  projectId: string,
): Promise<ProjectPaymentScheme | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw new Error(`getDefaultPaymentScheme failed: ${error.message}`)
  return data
}

/** Inserts a new payment scheme and returns the created row. */
export async function savePaymentScheme(
  schemeData: ProjectPaymentSchemeInsert,
): Promise<ProjectPaymentScheme> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .insert(schemeData)
    .select()
    .single()

  if (error) throw new Error(`savePaymentScheme failed: ${error.message}`)
  return data
}

/** Updates an existing scheme by id and returns the updated row. */
export async function updatePaymentScheme(
  id: string,
  schemeData: Partial<ProjectPaymentSchemeInsert>,
): Promise<ProjectPaymentScheme> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .update(schemeData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updatePaymentScheme failed: ${error.message}`)
  return data
}

/** Deletes a payment scheme by id. Throws if the delete fails. */
export async function deletePaymentScheme(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_payment_schemes')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`deletePaymentScheme failed: ${error.message}`)
}

/**
 * Promotes a scheme to the default for its project.
 *
 * Clears is_default on the current default, then sets is_default=true on the
 * new one and zeros its price_modifier_sqm (a default scheme has no modifier).
 * Two sequential updates — the partial unique index prevents two defaults existing
 * at the same time (only one row can have is_default=true per project_id).
 */
export async function setDefaultScheme(
  projectId: string,
  newDefaultId: string,
): Promise<void> {
  const supabase = createClient()

  // Step 1: clear the current default for this project
  const { error: clearError } = await supabase
    .from('project_payment_schemes')
    .update({ is_default: false })
    .eq('project_id', projectId)
    .eq('is_default', true)

  if (clearError) throw new Error(`setDefaultScheme (clear) failed: ${clearError.message}`)

  // Step 2: promote the chosen scheme and zero its modifier
  const { error: setError } = await supabase
    .from('project_payment_schemes')
    .update({ is_default: true, price_modifier_sqm: 0 })
    .eq('id', newDefaultId)

  if (setError) throw new Error(`setDefaultScheme (set) failed: ${setError.message}`)
}

/**
 * Bulk query: returns a map of project_id → default scheme name
 * for a list of project ids. Used by the projects list page to show
 * the Default Scheme column without N+1 queries.
 *
 * Projects without a default scheme are absent from the returned map.
 */
export async function getDefaultSchemeNames(
  projectIds: string[],
): Promise<Record<string, string>> {
  if (projectIds.length === 0) return {}

  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_payment_schemes')
    .select('project_id, name')
    .in('project_id', projectIds)
    .eq('is_default', true)

  if (error) throw new Error(`getDefaultSchemeNames failed: ${error.message}`)

  return Object.fromEntries(data.map((row) => [row.project_id, row.name]))
}
