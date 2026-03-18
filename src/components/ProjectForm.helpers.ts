/**
 * Helper utilities for ProjectForm — kept separate to stay within
 * the 300-line file limit while keeping the UI component focused.
 */

import type { Project } from '../types'
import { BuildingStage } from '../config/domain'
import type { FieldValues } from './ProjectFields'

export const PROJECT_FORM_SAMPLE_TEXT = [
  'Project: Synera Residence',
  'Developer: Bulgarian Properties',
  'Neighborhood: Манастирски ливади - изток, Sofia',
  'Stage: Act 14 (construction started)',
  'Completion: December 2026',
  'Total floors: 10  |  Total apartments: 95',
  'Price: 1 850 EUR/sqm (incl. VAT)  |  Price date: March 2026',
  'Gross yield: 5.2%',
  'Currency: EUR',
  'Commission: 2%  |  Source: Bulgarian Properties website',
  'Payment: 20% on signing, 30% on Act 14, 50% on Act 16',
  'Notes: South-facing units available. Parking included above 5th floor.',
].join('\n')

export const PROJECT_FORM_EMPTY_FIELDS: FieldValues = {
  neighborhood_id: '',
  title: '',
  developer: null,
  source: null,
  commission: null,
  total_apartments: null,
  total_floors: null,
  current_stage: BuildingStage.PLANNING,
  completion_date: null,
  building_notes: null,
  currency: null,
  price_sqm: null,
  price_date: null,
  payment_schedule: null,
  notes: null,
  ai_summary: null,
}

/**
 * Serialises an existing Project record into plain text so the AI can
 * re-process it during an edit workflow.
 */
export function serializeExistingProject(p: Project): string {
  const lines = [
    `Title: ${p.title}`,
    p.developer       ? `Developer: ${p.developer}`             : null,
    p.source          ? `Source: ${p.source}`                   : null,
    p.commission      ? `Commission: ${p.commission}`           : null,
    p.current_stage   ? `Stage: ${p.current_stage}`             : null,
    p.completion_date ? `Completion date: ${p.completion_date}` : null,
    p.price_sqm !== null ? `Price/sqm: ${p.price_sqm} ${p.currency ?? 'EUR'}` : null,
    p.total_apartments !== null ? `Total apartments: ${p.total_apartments}` : null,
    p.total_floors !== null ? `Total floors: ${p.total_floors}` : null,
    p.building_notes  ? `Building notes: ${p.building_notes}`   : null,
    p.notes           ? `Notes: ${p.notes}`                     : null,
  ]
  return lines.filter(Boolean).join('\n')
}
