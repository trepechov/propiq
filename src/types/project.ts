/**
 * TypeScript interface and Zod schema for the `projects` DB table.
 *
 * A Project is a single real estate development (building or complex).
 * It belongs to one Neighborhood and contains many Units.
 *
 * Relationship: one Neighborhood → many Projects → many Units.
 */

import { z } from 'zod'
import { BuildingStage } from '../config/domain'
import type { PaymentInstallment } from '../config/domain'

// ── TypeScript interface ──────────────────────────────────────────────────────

/**
 * Matches the `projects` table in Supabase exactly.
 * Numeric DB columns (integer, numeric) map to `number`.
 * Date columns (date) are returned as ISO 8601 strings by Supabase JS client.
 * `payment_schedule` is stored as jsonb and deserialized to typed objects.
 */
export interface Project {
  id: string
  created_at: string
  updated_at: string
  neighborhood_id: string
  // Identity
  title: string
  developer: string | null
  source: string | null
  commission: string | null
  // Building
  total_apartments: number | null
  total_floors: number | null
  current_stage: BuildingStage
  completion_date: string | null
  building_notes: string | null
  // Financials
  currency: string | null
  price_sqm: number | null
  price_date: string | null
  gross_yield: number | null
  // Payment schedule — jsonb deserialized to typed objects
  payment_schedule: PaymentInstallment[] | null
  // Notes
  notes: string | null
  ai_summary: string | null
}

/** Used for insert operations — omits server-generated fields. */
export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>

// ── Zod schema ────────────────────────────────────────────────────────────────

/**
 * Payment installment sub-schema — mirrors the PaymentInstallment interface.
 * `trigger` is kept as a plain string to match the jsonb storage format.
 */
const paymentInstallmentSchema = z.object({
  percentage: z.number().min(0).max(100),
  trigger: z.string(),
})

/**
 * Validates Gemini extraction output for a project.
 * `neighborhood_id` and `title` are required.
 * `current_stage` must be one of the BuildingStage values.
 */
export const projectSchema = z.object({
  neighborhood_id: z.string().uuid(),
  // Identity
  title: z.string().min(1, 'Project title is required'),
  developer: z.string().nullable().default(null),
  source: z.string().nullable().default(null),
  commission: z.string().nullable().default(null),
  // Building
  total_apartments: z.number().nullable().default(null),
  total_floors: z.number().nullable().default(null),
  current_stage: z.enum(
    Object.values(BuildingStage) as [string, ...string[]]
  ),
  completion_date: z.string().nullable().default(null),
  building_notes: z.string().nullable().default(null),
  // Financials
  currency: z.string().nullable().default(null),
  price_sqm: z.number().nullable().default(null),
  price_date: z.string().nullable().default(null),
  gross_yield: z.number().nullable().default(null),
  // Payment schedule
  payment_schedule: z.array(paymentInstallmentSchema).nullable().default(null),
  // Notes
  notes: z.string().nullable().default(null),
  ai_summary: z.string().nullable().default(null),
})

/**
 * Used for Supabase inserts — same shape as projectSchema.
 * Aliased explicitly to signal insert intent at the call site.
 */
export const projectInsertSchema = projectSchema

export type ProjectExtraction = z.infer<typeof projectSchema>
