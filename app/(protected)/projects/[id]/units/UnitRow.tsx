'use client'

/**
 * UnitRow and UnitsTableHead — table components for the units listing page.
 *
 * Extracted to keep units/page.tsx within the 300-line limit.
 * UnitRow accepts pre-computed display prices so the parent can apply scheme
 * modifiers without mutating unit objects.
 */

import {
  IconButton,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  UNIT_TYPE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_DIRECTION_LABELS,
} from '@/config/domain'
import type { UnitType, UnitStatus, UnitDirection } from '@/config/domain'
import type { Unit } from '@/types'

function formatNumber(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString()
}

function formatArea(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)} m²`
}

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString()
}

// ── UnitsTableHead ────────────────────────────────────────────────────────────

interface UnitsTableHeadProps {
  sortField: string
  sortDir: 'asc' | 'desc'
  onSort: (field: string) => void
  priceSqmHeader: string
  totalPriceHeader: string
}

export function UnitsTableHead({
  sortField,
  sortDir,
  onSort,
  priceSqmHeader,
  totalPriceHeader,
}: UnitsTableHeadProps) {
  function col(field: string, label: string, align?: 'right') {
    return (
      <TableCell align={align} sortDirection={sortField === field ? sortDir : false}>
        <TableSortLabel
          active={sortField === field}
          direction={sortField === field ? sortDir : 'asc'}
          onClick={() => onSort(field)}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    )
  }

  return (
    <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: 'grey.100', fontWeight: 600 } }}>
      <TableRow>
        {col('unit_type', 'Type')}
        {col('apartment_number', 'Number / ID')}
        {col('floor', 'Floor', 'right')}
        {col('net_area', 'Net Area', 'right')}
        {col('total_area', 'Total Area', 'right')}
        {col('price_sqm_vat', priceSqmHeader, 'right')}
        {col('total_price_vat', totalPriceHeader, 'right')}
        {col('direction', 'Direction')}
        {col('status', 'Status')}
        <TableCell>Notes</TableCell>
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
  )
}

// ── UnitRow ───────────────────────────────────────────────────────────────────

export interface UnitRowProps {
  unit: Unit
  /** Adjusted price per m² — may differ from unit.price_sqm_vat for non-default schemes */
  displayPriceSqm: number | null
  /** Adjusted total price — may differ from unit.total_price_vat for non-default schemes */
  displayTotalPrice: number | null
  onDelete: () => void
}

export default function UnitRow({
  unit,
  displayPriceSqm,
  displayTotalPrice,
  onDelete,
}: UnitRowProps) {
  const typeLabel      = UNIT_TYPE_LABELS[unit.unit_type as UnitType] ?? unit.unit_type
  const statusLabel    = UNIT_STATUS_LABELS[unit.status as UnitStatus] ?? unit.status
  const directionLabel = unit.direction
    ? (UNIT_DIRECTION_LABELS[unit.direction as UnitDirection] ?? unit.direction)
    : '—'

  const identifier = unit.apartment_number ?? unit.identifier ?? '—'

  return (
    <TableRow hover>
      <TableCell>{typeLabel}</TableCell>
      <TableCell>{identifier}</TableCell>
      <TableCell align="right">{formatNumber(unit.floor)}</TableCell>
      <TableCell align="right">{formatArea(unit.net_area)}</TableCell>
      <TableCell align="right">{formatArea(unit.total_area)}</TableCell>
      <TableCell align="right">{formatPrice(displayPriceSqm)}</TableCell>
      <TableCell align="right">{formatPrice(displayTotalPrice)}</TableCell>
      <TableCell>{directionLabel}</TableCell>
      <TableCell>{statusLabel}</TableCell>
      <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {unit.notes ?? '—'}
      </TableCell>
      <TableCell align="right">
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label="delete unit"
          sx={{ color: 'grey.500' }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  )
}
