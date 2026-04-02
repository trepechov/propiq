/**
 * TypeScript interface and Zod schema for the `project_payment_schemes` DB table.
 *
 * A PaymentScheme belongs to one Project. Each project has exactly one default
 * scheme (is_default = true, price_modifier_sqm = 0), which is extracted from
 * proposal text during AI import. Alternative schemes store a signed flat
 * adjustment in the project's currency per m².
 *
 * Relationship: one Project → many PaymentSchemes (exactly one is_default).
 */

import { z } from 'zod'

// ── Shared installment sub-schema ─────────────────────────────────────────────
// Moved here from types/project.ts so both project and payment-scheme code
// share the same definition. Re-exported from types/project.ts for backward compat.

export const paymentInstallmentSchema = z.object({
  percentage: z.number().min(0).max(100),
  trigger: z.string(),
})

export type PaymentInstallmentData = z.infer<typeof paymentInstallmentSchema>

// ── TypeScript interface ──────────────────────────────────────────────────────

/**
 * Matches the `project_payment_schemes` table in Supabase exactly.
 * `installments` is stored as jsonb and deserialized to typed objects.
 */
export interface ProjectPaymentScheme {
  id: string
  created_at: string
  updated_at: string
  project_id: string
  /** Shorthand notation, e.g. "20-80" or "20-30-40-10" */
  name: string
  installments: PaymentInstallmentData[]
  /** True for the default scheme (price_modifier_sqm is always 0 for this row). */
  is_default: boolean
  /**
   * Flat adjustment per m² in the project's currency.
   * Positive = premium (low-down investor scheme), negative = discount (cash buyer).
   * Always 0 for the default scheme.
   */
  price_modifier_sqm: number
  notes: string | null
}

/** Used for insert operations — omits server-generated fields. */
export type ProjectPaymentSchemeInsert = Omit<
  ProjectPaymentScheme,
  'id' | 'created_at' | 'updated_at'
>

// ── Zod schema ────────────────────────────────────────────────────────────────

export const projectPaymentSchemeSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, 'Scheme name is required'),
  installments: z.array(paymentInstallmentSchema).default([]),
  is_default: z.boolean().default(false),
  price_modifier_sqm: z.number().default(0),
  notes: z.string().nullable().default(null),
})

export const projectPaymentSchemeInsertSchema = projectPaymentSchemeSchema
