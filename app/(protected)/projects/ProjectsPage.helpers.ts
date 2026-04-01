/**
 * Sort comparator and filter config builder for the Projects table.
 * Extracted to keep page.tsx within the 300-line limit.
 */

import type { Project, Neighborhood } from '@/types'
import type { FilterConfig } from '@/hooks/useTableFilter'
import { BUILDING_STAGE_LABELS } from '@/config/domain'

/**
 * Builds the filter config array for the Projects table.
 * Depends on the loaded neighborhoods list for the neighborhood enum options.
 */
export function buildProjectFilterConfigs(
  neighborhoods: Neighborhood[],
): FilterConfig<Project>[] {
  return [
    { type: 'text', fields: ['title', 'developer'] },
    {
      type: 'enum',
      field: 'neighborhood_id',
      label: 'Neighborhood',
      options: neighborhoods.map(n => ({ value: n.id, label: n.name })),
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
      type: 'exactNumber',
      field: 'total_apartments',
      label: 'Units',
      placeholder: 'exact count',
    },
    {
      type: 'maxDate',
      field: 'completion_date',
      label: 'Completion by',
    },
  ]
}

export type SortDir = 'asc' | 'desc'

/**
 * Returns a comparator function for sorting projects by the given field.
 *
 * Special-case: 'neighborhood_name' is resolved via the provided lookup
 * function rather than reading a direct field from the Project object.
 */
export function buildProjectComparator(
  sortField: string,
  sortDir: SortDir,
  neighborhoodName: (id: string) => string,
): (a: Project, b: Project) => number {
  return (a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1

    if (sortField === 'neighborhood_name') {
      return dir * neighborhoodName(a.neighborhood_id).localeCompare(
        neighborhoodName(b.neighborhood_id),
      )
    }

    const av = a[sortField as keyof Project] as string | number | null
    const bv = b[sortField as keyof Project] as string | number | null

    if (av === null || av === undefined) return dir
    if (bv === null || bv === undefined) return -dir
    if (typeof av === 'string' && typeof bv === 'string')
      return dir * av.localeCompare(bv, undefined, { numeric: true })
    if (typeof av === 'number' && typeof bv === 'number')
      return dir * (av - bv)
    return 0
  }
}
