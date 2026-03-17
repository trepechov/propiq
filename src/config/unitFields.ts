/**
 * Unit field definitions — individual apartments, garages, or other unit types.
 *
 * A Unit belongs to a Project. Units are imported in bulk (all statuses),
 * not just available ones — sold/booked patterns reveal buyer preferences
 * and help evaluate future projects.
 *
 * Relationship: one Project → many Units.
 */

import type { FieldType } from './domain'
import {
  UnitStatus,  UNIT_STATUS_LABELS,
  UnitDirection, UNIT_DIRECTION_LABELS,
  UnitType,    UNIT_TYPE_LABELS,
} from './domain'

export interface UnitField {
  key: string
  label: string
  type: FieldType | 'enum'
  unit?: string
  required: boolean
  /** Hint injected into the Gemini extraction prompt for this field */
  extractionHint: string
  options?: { value: string; label: string }[]
}

export const unitFields: UnitField[] = [

  // ── Identity ───────────────────────────────────────────────────────────────
  {
    key: 'unit_type',
    label: 'Type',
    type: 'enum',
    required: true,
    extractionHint:
      'Type of unit. One of: ' +
      Object.values(UnitType).map(v => `"${v}" (${UNIT_TYPE_LABELS[v]})`).join(', ') + '.',
    options: Object.values(UnitType).map(v => ({ value: v, label: UNIT_TYPE_LABELS[v] })),
  },
  {
    key: 'apartment_number',
    label: 'Apt. Number',
    type: 'text',
    required: false,
    extractionHint: 'Apartment or unit number as shown in the sales list (e.g. "A12", "201").',
  },
  {
    key: 'identifier',
    label: 'Identifier',
    type: 'text',
    required: false,
    extractionHint:
      'Any additional unique identifier used by the developer — ' +
      'e.g. a notary reference, floor plan code, or internal SKU.',
  },
  {
    key: 'floor',
    label: 'Floor',
    type: 'number',
    required: false,
    extractionHint:
      'Floor number. Ground floor = 1. ' +
      'Higher floors generally command a premium and sell faster.',
  },

  // ── Areas ──────────────────────────────────────────────────────────────────
  {
    key: 'net_area',
    label: 'Net Area',
    type: 'number',
    unit: 'm²',
    required: false,
    extractionHint:
      'Net (private) floor area in square metres — excludes shared/common parts.',
  },
  {
    key: 'common_area',
    label: 'Common Area Share',
    type: 'number',
    unit: 'm²',
    required: false,
    extractionHint:
      'This unit\'s proportional share of common areas (stairs, lobby, corridors) in square metres.',
  },
  {
    key: 'total_area',
    label: 'Total Area',
    type: 'number',
    unit: 'm²',
    required: true,
    extractionHint:
      'Total area = net area + common area share, in square metres. ' +
      'This is the figure used for pricing (total_area × price_sqm_vat = total_price_vat).',
  },

  // ── Pricing ────────────────────────────────────────────────────────────────
  {
    key: 'price_sqm_vat',
    label: 'Price / m² (VAT incl.)',
    type: 'currency',
    unit: '/ m²',
    required: true,
    extractionHint:
      'Price per square metre inclusive of VAT, in the project currency. ' +
      'Applied to total_area to derive the total price.',
  },
  {
    key: 'total_price_vat',
    label: 'Total Price (VAT incl.)',
    type: 'currency',
    required: true,
    extractionHint:
      'Total asking price inclusive of VAT = total_area × price_sqm_vat. ' +
      'If stated explicitly, use that figure; otherwise compute it.',
  },

  // ── Characteristics ────────────────────────────────────────────────────────
  {
    key: 'direction',
    label: 'Orientation',
    type: 'enum',
    required: false,
    extractionHint:
      'Cardinal direction the main facade / living area faces. ' +
      'South is most desirable (natural light). One of: ' +
      Object.values(UnitDirection).map(v => `"${v}" (${UNIT_DIRECTION_LABELS[v]})`).join(', ') + '.',
    options: Object.values(UnitDirection).map(v => ({ value: v, label: UNIT_DIRECTION_LABELS[v] })),
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    required: true,
    extractionHint:
      'Availability status. One of: ' +
      Object.values(UnitStatus).map(v => `"${v}" (${UNIT_STATUS_LABELS[v]})`).join(', ') +
      '. Import all statuses — sold/booked units reveal buyer preference patterns.',
    options: Object.values(UnitStatus).map(v => ({ value: v, label: UNIT_STATUS_LABELS[v] })),
  },

  // ── Notes & AI ─────────────────────────────────────────────────────────────
  {
    key: 'notes',
    label: 'Notes',
    type: 'text',
    required: false,
    extractionHint:
      'Any relevant observations about this specific unit — e.g. ' +
      '"open terrace above — leakage risk", "corner unit — extra windows", ' +
      '"faces internal courtyard", "next to lift shaft — noise".',
  },
  {
    key: 'ai_summary',
    label: 'AI Summary',
    type: 'text',
    required: true,
    extractionHint:
      'Write 2–3 sentences summarising this unit as an investment. ' +
      'Include: type, floor, orientation, area, price, and any notable risk or advantage. ' +
      'Be specific and factual — this is used as a search index.',
  },
]
