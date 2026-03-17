/**
 * TypeScript interface and Zod schema for the `neighborhoods` DB table.
 *
 * Neighborhoods are reusable location entities shared across multiple Projects.
 * They capture area character, transport, amenities, and the buyer demographic
 * most likely to purchase in the area.
 *
 * Relationship: one Neighborhood → many Projects.
 */

import { z } from 'zod'

// ── TypeScript interfaces ─────────────────────────────────────────────────────

/**
 * Matches the `neighborhoods` table in Supabase exactly.
 * `target_buyers` values are BuyerProfile strings stored as plain text in DB.
 */
export interface Neighborhood {
  id: string
  created_at: string
  updated_at: string
  name: string
  city: string
  /** BuyerProfile values stored as strings: 'families' | 'young_professionals' | etc. */
  target_buyers: string[]
  transport_links: string | null
  nearby_amenities: string | null
  neighbourhood_notes: string | null
}

/** Used for insert operations — omits server-generated fields. */
export type NeighborhoodInsert = Omit<Neighborhood, 'id' | 'created_at' | 'updated_at'>

// ── Zod schemas ───────────────────────────────────────────────────────────────

/**
 * Validates Gemini extraction output for a neighborhood.
 * `name` and `city` are required; all other fields are optional with null defaults.
 */
export const neighborhoodSchema = z.object({
  name: z.string().min(1, 'Neighborhood name is required'),
  city: z.string().min(1, 'City is required'),
  target_buyers: z.array(z.string()).default([]),
  transport_links: z.string().nullable().default(null),
  nearby_amenities: z.string().nullable().default(null),
  neighbourhood_notes: z.string().nullable().default(null),
})

/**
 * Used for Supabase inserts — same shape as neighborhoodSchema.
 * Aliased explicitly to signal insert intent at the call site.
 */
export const neighborhoodInsertSchema = neighborhoodSchema

export type NeighborhoodExtraction = z.infer<typeof neighborhoodSchema>
