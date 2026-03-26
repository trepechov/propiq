/**
 * Project field definitions — what to extract, display, and store for each project.
 *
 * A Project is a single real estate development (building / complex).
 * It belongs to a Neighborhood (see neighborhoodFields.ts).
 *
 * To add a column: add one entry here. The Gemini extraction prompt,
 * review form, and comparison table all derive from this config.
 */

import type { FieldType } from './domain'
import { BuildingStage, BUILDING_STAGE_LABELS } from './domain'

export interface ProjectField {
  key: string
  label: string
  type: FieldType | 'enum' | 'payment_schedule'
  unit?: string
  required: boolean
  /** Hint injected into the Gemini extraction prompt for this field */
  extractionHint: string
  /** For enum fields — the allowed values with labels */
  options?: { value: string; label: string }[]
}

export const projectFields: ProjectField[] = [

  // ── Identity ───────────────────────────────────────────────────────────────
  {
    key: 'title',
    label: 'Project Name',
    type: 'text',
    required: true,
    extractionHint: 'Name of the development or building. Infer a short label if not stated explicitly.',
  },
  {
    key: 'developer',
    label: 'Developer',
    type: 'text',
    required: false,
    extractionHint: 'Name of the developer or construction company.',
  },
  {
    key: 'source',
    label: 'Source (Agency)',
    type: 'text',
    required: false,
    extractionHint:
      'Name of the real estate agency or broker that sent or published this proposal. ' +
      'Leave null if the developer is selling directly.',
  },
  {
    key: 'commission',
    label: 'Commission',
    type: 'text',
    required: false,
    extractionHint:
      'Buyer\'s commission charged by the agency. ' +
      'Return as a string that captures the exact structure — e.g. "0%", "3%", "1000 EUR flat". ' +
      'If no commission is mentioned, return "0%".',
  },

  // ── Building ───────────────────────────────────────────────────────────────
  {
    key: 'total_apartments',
    label: 'Total Apartments',
    type: 'number',
    required: false,
    extractionHint: 'Total number of residential units in the building or development.',
  },
  {
    key: 'total_floors',
    label: 'Total Floors',
    type: 'number',
    required: false,
    extractionHint:
      'Number of floors above ground. ' +
      'More floors = more units = longer construction time = later payment trigger dates.',
  },
  {
    key: 'current_stage',
    label: 'Current Stage',
    type: 'enum',
    required: true,
    extractionHint:
      'Current construction stage. Map to one of: ' +
      Object.entries(BUILDING_STAGE_LABELS)
        .map(([v, l]) => `"${v}" (${l})`)
        .join(', ') +
      '. Return the enum value string only.',
    options: Object.values(BuildingStage).map(v => ({
      value: v,
      label: BUILDING_STAGE_LABELS[v],
    })),
  },
  {
    key: 'completion_date',
    label: 'Completion Date',
    type: 'date',
    required: false,
    extractionHint:
      'Expected Act 16 (full completion) date. ' +
      'ISO 8601 format (YYYY-MM-DD). Use first day of month if only month/year given.',
  },
  {
    key: 'building_notes',
    label: 'Building Notes',
    type: 'text',
    required: false,
    extractionHint:
      'Details about construction quality, materials, windows, finishes, or amenities. ' +
      'This signals the premium level of the building.',
  },

  // ── Financials ─────────────────────────────────────────────────────────────
  {
    key: 'currency',
    label: 'Currency',
    type: 'text',
    required: false,
    extractionHint: 'ISO 4217 currency code (e.g. USD, EUR, BGN). Default to EUR if unclear.',
  },
  {
    key: 'price_sqm',
    label: 'Price / sqm',
    type: 'currency',
    required: true,
    extractionHint: 'Asking price per square metre in the listed currency.',
  },
  {
    key: 'price_date',
    label: 'Price Date',
    type: 'date',
    required: false,
    extractionHint:
      'The date this price was quoted or the proposal was issued. ' +
      'ISO 8601 format (YYYY-MM-DD). Prices change over time — this anchors the figure to a point in time. ' +
      'Use the document date, email date, or publication date if explicit.',
  },

  // ── Payment ────────────────────────────────────────────────────────────────
  {
    key: 'payment_schedule',
    label: 'Payment Schedule',
    type: 'payment_schedule',
    required: false,
    extractionHint:
      'Payment plan as a list of installments. Each installment has: ' +
      '"percentage" (number) and "trigger" (one of: "signing", "act14", "act15", "act16"). ' +
      'Example for 20-80: [{"percentage":20,"trigger":"signing"},{"percentage":80,"trigger":"act16"}]. ' +
      'Return an array of objects.',
  },

  // ── Notes ──────────────────────────────────────────────────────────────────
  {
    key: 'notes',
    label: 'Notes',
    type: 'text',
    required: false,
    extractionHint:
      'Any other relevant details not captured above: ROI projections, restrictions, ' +
      'legal caveats, or general observations.',
  },

  // ── AI-generated ───────────────────────────────────────────────────────────
  {
    key: 'ai_summary',
    label: 'AI Summary',
    type: 'text',
    required: true,
    extractionHint:
      'Write a concise 3–5 sentence summary of this project as a real estate investment opportunity. ' +
      'Cover: location, stage, price level, payment structure, and the key investment case (or red flags). ' +
      'This summary will be used as a search index and as context for future AI queries — ' +
      'be specific, factual, and include numbers. Do not use marketing language.',
  },
]
