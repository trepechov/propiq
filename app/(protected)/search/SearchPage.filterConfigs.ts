/**
 * Filter config builders for the Search page pre-filter panel.
 *
 * Kept in a separate file to stay within the 300-line limit of SearchPage.helpers.tsx.
 * No JSX — pure TypeScript config objects.
 *
 * Usage:
 *   - buildSearchProjectFilterConfigs(neighborhoods) — wrap in useMemo (depends on neighborhoods)
 *   - SEARCH_UNIT_FILTER_CONFIGS — module-level constant (static, no dependencies)
 */

import type { Project, Neighborhood } from '@/types'
import type { Unit } from '@/types/unit'
import type { FilterConfig } from '@/hooks/useTableFilter'
import {
  BUILDING_STAGE_LABELS,
  UNIT_TYPE_LABELS,
  UNIT_DIRECTION_LABELS,
  UNIT_STATUS_LABELS,
} from '@/config/domain'

/**
 * Builds filter configs for the project portion of the pre-filter panel.
 * Depends on the loaded neighborhoods list — call inside useMemo on the page.
 *
 * Filters: title/developer text, neighborhood enum, stage enum,
 *          max price/m², completion by (max date).
 */
export function buildSearchProjectFilterConfigs(
  neighborhoods: Neighborhood[],
): FilterConfig<Project>[] {
  return [
    { type: 'text', fields: ['title', 'developer'] },
    {
      type: 'enum',
      field: 'neighborhood_id',
      label: 'Neighborhood',
      options: neighborhoods.map((n) => ({ value: n.id, label: n.name })),
    },
    {
      type: 'enum',
      field: 'current_stage',
      label: 'Stage',
      options: Object.entries(BUILDING_STAGE_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      type: 'maxNumber',
      field: 'price_sqm',
      label: 'Max Price/m²',
      placeholder: 'e.g. 2000',
    },
    {
      type: 'maxDate',
      field: 'completion_date',
      label: 'Completion by',
    },
  ]
}

/**
 * Static filter configs for the unit portion of the pre-filter panel.
 * All statuses are loaded client-side; the server still only sends AVAILABLE
 * units to the AI regardless of which status the user selects here.
 */
export const SEARCH_UNIT_FILTER_CONFIGS: FilterConfig<Unit>[] = [
  {
    type: 'enum',
    field: 'status',
    label: 'Status',
    options: Object.entries(UNIT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    type: 'enum',
    field: 'unit_type',
    label: 'Type',
    options: Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    type: 'exactNumber',
    field: 'floor',
    label: 'Floor',
    placeholder: 'exact floor',
  },
  {
    type: 'maxNumber',
    field: 'net_area',
    label: 'Max Net Area',
    placeholder: 'e.g. 80',
  },
  {
    type: 'maxNumber',
    field: 'total_area',
    label: 'Max Total Area',
    placeholder: 'e.g. 90',
  },
  {
    type: 'maxNumber',
    field: 'price_sqm_vat',
    label: 'Max Price/m²',
    placeholder: 'e.g. 2000',
  },
  {
    type: 'maxNumber',
    field: 'total_price_vat',
    label: 'Max Total Price',
    placeholder: 'e.g. 150000',
  },
  {
    type: 'enum',
    field: 'direction',
    label: 'Direction',
    options: Object.entries(UNIT_DIRECTION_LABELS).map(([value, label]) => ({ value, label })),
  },
]
