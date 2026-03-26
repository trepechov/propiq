/**
 * TypeScript interface and Zod schema for the `search_feedback` DB table.
 *
 * search_feedback rows capture user thumbs-up / thumbs-down ratings on
 * individual results returned by the Opportunity Search screen. Over time,
 * these signals are used to refine evaluation criteria.
 *
 * Relationship: standalone — references projects(id) and optionally units(id).
 */

import { z } from 'zod'

// ── Domain constants ──────────────────────────────────────────────────────────

export const MatchType = {
  MATCHING:     'matching',
  NON_MATCHING: 'non_matching',
} as const

export type MatchType = typeof MatchType[keyof typeof MatchType]

export const FeedbackRating = {
  UP:   'up',
  DOWN: 'down',
} as const

export type FeedbackRating = typeof FeedbackRating[keyof typeof FeedbackRating]

// ── TypeScript interfaces ─────────────────────────────────────────────────────

/** Matches the `search_feedback` table in Supabase exactly. */
export interface SearchFeedback {
  id: string
  created_at: string
  query_text: string
  result_project_id: string
  result_unit_id: string | null
  match_type: MatchType
  rating: FeedbackRating
  note: string | null
}

/** Used for insert operations — omits server-generated fields. */
export type SearchFeedbackInsert = Omit<SearchFeedback, 'id' | 'created_at'>

// ── Zod schemas ───────────────────────────────────────────────────────────────

/**
 * Validates insert payloads for search_feedback.
 * All required fields must be present; note is optional.
 */
export const SearchFeedbackInsertSchema = z.object({
  query_text:        z.string().min(1, 'Query text is required'),
  result_project_id: z.string().uuid('result_project_id must be a valid UUID'),
  result_unit_id:    z.string().uuid().nullable().default(null),
  match_type:        z.enum(
    Object.values(MatchType) as [MatchType, ...MatchType[]]
  ),
  rating:            z.enum(
    Object.values(FeedbackRating) as [FeedbackRating, ...FeedbackRating[]]
  ),
  note:              z.string().nullable().default(null),
})
