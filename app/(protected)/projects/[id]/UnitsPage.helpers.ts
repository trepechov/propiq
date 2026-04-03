/**
 * Sort comparator, filter config builder, and price-adjustment helper
 * for the Units table. Extracted to keep page.tsx within the 300-line limit.
 */

import type { Unit } from '@/types'
import type { FilterConfig } from '@/hooks/useTableFilter'

// ── Price adjustment ──────────────────────────────────────────────────────────

export interface AdjustedPrices {
  priceSqm: number | null
  totalPrice: number | null
}

/**
 * Applies a flat per-m² scheme modifier to a unit's prices.
 *
 * Business rule: unit prices are stored for the default scheme (modifier = 0).
 * Alternative schemes add or subtract a flat amount per m².
 * Total price is recalculated as `total_area × adjusted_price_sqm`.
 * If `total_area` is null, `totalPrice` is null — we can't recalculate without area.
 *
 * @param unit - The unit whose stored prices are the default-scheme baseline
 * @param modifierSqm - Signed flat adjustment in the project's currency per m²
 */
export function applySchemeModifier(unit: Unit, modifierSqm: number): AdjustedPrices {
  if (modifierSqm === 0) {
    return { priceSqm: unit.price_sqm_vat, totalPrice: unit.total_price_vat }
  }

  const priceSqm = unit.price_sqm_vat != null
    ? unit.price_sqm_vat + modifierSqm
    : null

  const totalPrice = unit.total_area != null && priceSqm != null
    ? unit.total_area * priceSqm
    : null

  return { priceSqm, totalPrice }
}
import {
  UNIT_TYPE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_DIRECTION_LABELS,
} from '@/config/domain'

export type SortDir = 'asc' | 'desc'

/**
 * Builds the filter config array for the Units table.
 * All options are static enums — no dynamic data needed.
 */
export function buildUnitFilterConfigs(): FilterConfig<Unit>[] {
  return [
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
    {
      type: 'exactNumber',
      field: 'bedrooms',
      label: 'Bedrooms',
      placeholder: 'e.g. 2',
    },
    {
      type: 'enum',
      field: 'status',
      label: 'Status',
      options: Object.entries(UNIT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    },
  ]
}

/**
 * Returns a comparator function for sorting units by the given field.
 *
 * Special-case: 'apartment_number' falls back to 'identifier' when null,
 * matching the display logic used in UnitRow.
 */
export function buildUnitComparator(
  sortField: string,
  sortDir: SortDir,
): (a: Unit, b: Unit) => number {
  return (a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1

    if (sortField === 'apartment_number') {
      const av = a.apartment_number ?? a.identifier ?? ''
      const bv = b.apartment_number ?? b.identifier ?? ''
      return dir * av.localeCompare(bv, undefined, { numeric: true })
    }

    const av = a[sortField as keyof Unit] as string | number | null
    const bv = b[sortField as keyof Unit] as string | number | null

    if (av === null || av === undefined) return dir
    if (bv === null || bv === undefined) return -dir
    if (typeof av === 'string' && typeof bv === 'string')
      return dir * av.localeCompare(bv, undefined, { numeric: true })
    if (typeof av === 'number' && typeof bv === 'number')
      return dir * (av - bv)
    return 0
  }
}
