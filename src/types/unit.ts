/**
 * TypeScript interface and Zod schema for the `units` DB table.
 *
 * Units are individual apartments, garages, parking spaces, or storage units
 * belonging to a Project. All statuses (available, booked, sold) are imported —
 * sold/booked patterns reveal which unit types, floors, and orientations
 * buyers prefer, informing evaluation of future projects.
 *
 * Relationship: one Project → many Units.
 */

import { z } from 'zod'
import { UnitType, UnitDirection, UnitStatus } from '../config/domain'

// ── TypeScript interface ──────────────────────────────────────────────────────

/**
 * Matches the `units` table in Supabase exactly.
 * Numeric DB columns (integer, numeric) map to `number`.
 */
export interface Unit {
  id: string
  created_at: string
  updated_at: string
  project_id: string
  // Identity
  unit_type: UnitType
  apartment_number: string | null
  identifier: string | null
  floor: number | null
  // Areas (square metres)
  net_area: number | null
  common_area: number | null
  total_area: number | null
  // Pricing (VAT inclusive, in parent project's currency)
  price_sqm_vat: number | null
  total_price_vat: number | null
  // Characteristics
  direction: UnitDirection | null
  status: UnitStatus
  // Notes
  notes: string | null
  ai_summary: string | null
}

/** Used for insert operations — omits server-generated fields. */
export type UnitInsert = Omit<Unit, 'id' | 'created_at' | 'updated_at'>

// ── Zod schema ────────────────────────────────────────────────────────────────

/**
 * Validates Gemini extraction output for a unit.
 * `project_id`, `unit_type`, and `status` are required.
 * `direction` is nullable — not all proposals include orientation data.
 */
export const unitSchema = z.object({
  project_id: z.string().uuid(),
  // Identity
  unit_type: z.enum(Object.values(UnitType) as [string, ...string[]]),
  apartment_number: z.string().nullable().default(null),
  identifier: z.string().nullable().default(null),
  floor: z.number().nullable().default(null),
  // Areas
  net_area: z.number().nullable().default(null),
  common_area: z.number().nullable().default(null),
  total_area: z.number().nullable().default(null),
  // Pricing
  price_sqm_vat: z.number().nullable().default(null),
  total_price_vat: z.number().nullable().default(null),
  // Characteristics
  direction: z.enum(Object.values(UnitDirection) as [string, ...string[]]).nullable().default(null),
  status: z.enum(Object.values(UnitStatus) as [string, ...string[]]),
  // Notes
  notes: z.string().nullable().default(null),
  ai_summary: z.string().nullable().default(null),
})

/**
 * Used for Supabase inserts — same shape as unitSchema.
 * Aliased explicitly to signal insert intent at the call site.
 */
export const unitInsertSchema = unitSchema

export type UnitExtraction = z.infer<typeof unitSchema>
