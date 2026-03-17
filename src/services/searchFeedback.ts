/**
 * Supabase CRUD helpers for the `search_feedback` table.
 *
 * Throws on error — callers are responsible for handling failures.
 */

import { supabase } from './supabase'
import type { SearchFeedback, SearchFeedbackInsert } from '../types'

/** Inserts a feedback row and returns the created record. */
export async function saveFeedback(
  data: SearchFeedbackInsert,
): Promise<SearchFeedback> {
  const { data: row, error } = await supabase
    .from('search_feedback')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`saveFeedback failed: ${error.message}`)
  return row
}
