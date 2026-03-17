/**
 * Supabase CRUD helpers for the `neighborhoods` table.
 *
 * All functions throw on error — callers are responsible for handling failures.
 * No silent failures: every Supabase error surfaces immediately.
 */

import { supabase } from './supabase'
import type { Neighborhood, NeighborhoodInsert } from '../types'

/** Returns all neighborhoods ordered by name. */
export async function getNeighborhoods(): Promise<Neighborhood[]> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('*')
    .order('name')

  if (error) throw new Error(`getNeighborhoods failed: ${error.message}`)
  return data
}

/** Returns a single neighborhood by id. Throws if not found. */
export async function getNeighborhood(id: string): Promise<Neighborhood> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`getNeighborhood failed: ${error.message}`)
  return data
}

/** Inserts a new neighborhood and returns the created row. */
export async function saveNeighborhood(
  neighborhoodData: NeighborhoodInsert,
): Promise<Neighborhood> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .insert(neighborhoodData)
    .select()
    .single()

  if (error) throw new Error(`saveNeighborhood failed: ${error.message}`)
  return data
}

/** Updates an existing neighborhood by id and returns the updated row. */
export async function updateNeighborhood(
  id: string,
  neighborhoodData: Partial<NeighborhoodInsert>,
): Promise<Neighborhood> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .update(neighborhoodData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateNeighborhood failed: ${error.message}`)
  return data
}

/** Deletes a neighborhood by id. Throws if the delete fails. */
export async function deleteNeighborhood(id: string): Promise<void> {
  const { error } = await supabase
    .from('neighborhoods')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`deleteNeighborhood failed: ${error.message}`)
}
