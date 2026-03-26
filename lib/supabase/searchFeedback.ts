/**
 * Supabase CRUD helpers for the `search_feedback` table.
 *
 * Throws on error — callers are responsible for handling failures.
 *
 * Both functions use the browser client. In Phase 3, the search Route Handler
 * will call getSearchFeedback() directly via the server client to pass the
 * user session to RLS — that call site lives in the Route Handler itself.
 */

import { createClient } from './client'
import type { SearchFeedback, SearchFeedbackInsert } from '../../types'

const MAX_TEXT_LENGTH = 200

/** Inserts a feedback row and returns the created record. */
export async function saveFeedback(
  data: SearchFeedbackInsert,
): Promise<SearchFeedback> {
  const truncated: SearchFeedbackInsert = {
    ...data,
    query_text: data.query_text.slice(0, MAX_TEXT_LENGTH),
    note: data.note != null ? data.note.slice(0, MAX_TEXT_LENGTH) : data.note,
  }

  const supabase = createClient()
  const { data: row, error } = await supabase
    .from('search_feedback')
    .insert(truncated)
    .select()
    .single()

  if (error) throw new Error(`saveFeedback failed: ${error.message}`)
  return row
}

/**
 * Returns the most recent feedback rows, ordered by creation date descending.
 *
 * Used to inject past signals into the opportunity search prompt so Gemini
 * can learn from prior user reactions.
 *
 * @param limit - Max rows to fetch (default 100)
 */
export async function getSearchFeedback(limit = 100): Promise<SearchFeedback[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('search_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getSearchFeedback failed: ${error.message}`)
  return data
}
