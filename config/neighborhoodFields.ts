/**
 * Neighborhood field definitions.
 *
 * A Neighborhood is a reusable entity shared across multiple Projects.
 * It captures location context and demographic / buyer profile information
 * that stays stable regardless of which development is being evaluated.
 *
 * Relationship: one Neighborhood → many Projects.
 */

import type { FieldType } from './domain'
import { BUYER_PROFILE_LABELS } from './domain'
import type { BuyerProfile } from './domain'

export interface NeighborhoodField {
  key: string
  label: string
  type: FieldType | 'enum' | 'multi_enum'
  required: boolean
  extractionHint: string
  options?: { value: string; label: string }[]
}

export const neighborhoodFields: NeighborhoodField[] = [

  // ── Identity ───────────────────────────────────────────────────────────────
  {
    key: 'name',
    label: 'Neighbourhood Name',
    type: 'text',
    required: true,
    extractionHint: 'Name of the neighbourhood, district, or area (e.g. "Lozenets", "Mladost 1").',
  },
  {
    key: 'city',
    label: 'City',
    type: 'text',
    required: true,
    extractionHint: 'City or municipality the neighbourhood belongs to.',
  },

  // ── Demographic / Buyer profile ────────────────────────────────────────────
  {
    key: 'target_buyers',
    label: 'Target Buyers',
    type: 'multi_enum',
    required: false,
    extractionHint:
      'Who is likely to buy or rent in this neighbourhood once buildings are complete. ' +
      'Return an array of matching values from: ' +
      (Object.keys(BUYER_PROFILE_LABELS) as BuyerProfile[])
        .map(k => `"${k}" (${BUYER_PROFILE_LABELS[k]})`)
        .join(', ') + '.',
    options: (Object.keys(BUYER_PROFILE_LABELS) as BuyerProfile[]).map(k => ({
      value: k,
      label: BUYER_PROFILE_LABELS[k],
    })),
  },

  // ── Character ──────────────────────────────────────────────────────────────
  {
    key: 'transport_links',
    label: 'Transport Links',
    type: 'text',
    required: false,
    extractionHint:
      'Nearby metro stops, bus lines, or road access. Signals commuter convenience.',
  },
  {
    key: 'nearby_amenities',
    label: 'Nearby Amenities',
    type: 'text',
    required: false,
    extractionHint:
      'Schools, hospitals, shopping centres, parks, or co-working spaces within walking distance.',
  },
  {
    key: 'neighbourhood_notes',
    label: 'Neighbourhood Notes',
    type: 'text',
    required: false,
    extractionHint:
      'General character of the area: quiet/busy, up-and-coming, established, industrial nearby, etc.',
  },
]
