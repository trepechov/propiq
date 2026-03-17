/**
 * Supabase CRUD helpers for the `units` table.
 *
 * All functions throw on error — callers are responsible for handling failures.
 * No silent failures: every Supabase error surfaces immediately.
 */

import { supabase } from './supabase'
import type { Unit, UnitInsert } from '../types'

/**
 * Returns all units for a project ordered by floor then apartment_number.
 * Always scoped to a project — loading all units globally has no use case.
 */
export async function getUnits(projectId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('project_id', projectId)
    .order('floor')
    .order('apartment_number')

  if (error) throw new Error(`getUnits failed: ${error.message}`)
  return data
}

/** Returns a single unit by id. Throws if not found. */
export async function getUnit(id: string): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`getUnit failed: ${error.message}`)
  return data
}

/** Inserts a single unit and returns the created row. */
export async function saveUnit(unitData: UnitInsert): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .insert(unitData)
    .select()
    .single()

  if (error) throw new Error(`saveUnit failed: ${error.message}`)
  return data
}

/**
 * Bulk-inserts multiple units in a single round-trip and returns the created rows.
 * Used by the import flow when saving all units extracted from a proposal at once.
 * Preserves insertion order in the returned array.
 */
export async function saveUnits(unitsData: UnitInsert[]): Promise<Unit[]> {
  if (unitsData.length === 0) return []

  const { data, error } = await supabase
    .from('units')
    .insert(unitsData)
    .select()

  if (error) throw new Error(`saveUnits failed: ${error.message}`)
  return data
}

/** Updates an existing unit by id and returns the updated row. */
export async function updateUnit(
  id: string,
  unitData: Partial<UnitInsert>,
): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .update(unitData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateUnit failed: ${error.message}`)
  return data
}

/** Deletes a unit by id. Throws if the delete fails. */
export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`deleteUnit failed: ${error.message}`)
}
