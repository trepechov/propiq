'use client'

/**
 * Read-only preview table shown in UnitsImportForm after AI extraction.
 *
 * Displays the list of parsed units so users can review before committing
 * the bulk insert. Matches the column layout of UnitsPage for consistency.
 */

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { UnitInsert } from '@/types'
import {
  UNIT_TYPE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_DIRECTION_LABELS,
} from '@/config/domain'
import type { UnitType, UnitStatus, UnitDirection } from '@/config/domain'

interface Props {
  units: UnitInsert[]
}

function formatArea(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)} m²`
}

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString()
}

function formatNumber(value: number | null): string {
  if (value === null) return '—'
  return String(value)
}

export default function UnitsPreviewTable({ units }: Props) {
  return (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Preview — {units.length} unit{units.length !== 1 ? 's' : ''} extracted
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ overflow: 'auto', maxHeight: 360 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Number / ID</TableCell>
              <TableCell align="right">Floor</TableCell>
              <TableCell align="right">Net Area</TableCell>
              <TableCell align="right">Total Area</TableCell>
              <TableCell align="right">Price/m² (VAT)</TableCell>
              <TableCell align="right">Total Price (VAT)</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((unit, index) => (
              <PreviewRow key={index} unit={unit} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

interface PreviewRowProps {
  unit: UnitInsert
}

function PreviewRow({ unit }: PreviewRowProps) {
  const typeLabel      = UNIT_TYPE_LABELS[unit.unit_type as UnitType] ?? unit.unit_type
  const statusLabel    = UNIT_STATUS_LABELS[unit.status as UnitStatus] ?? unit.status
  const directionLabel = unit.direction
    ? (UNIT_DIRECTION_LABELS[unit.direction as UnitDirection] ?? unit.direction)
    : '—'

  const identifier = unit.apartment_number ?? unit.identifier ?? '—'

  return (
    <TableRow>
      <TableCell>{typeLabel}</TableCell>
      <TableCell>{identifier}</TableCell>
      <TableCell align="right">{formatNumber(unit.floor)}</TableCell>
      <TableCell align="right">{formatArea(unit.net_area)}</TableCell>
      <TableCell align="right">{formatArea(unit.total_area)}</TableCell>
      <TableCell align="right">{formatPrice(unit.price_sqm_vat)}</TableCell>
      <TableCell align="right">{formatPrice(unit.total_price_vat)}</TableCell>
      <TableCell>{directionLabel}</TableCell>
      <TableCell>{statusLabel}</TableCell>
      <TableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {unit.notes ?? '—'}
      </TableCell>
    </TableRow>
  )
}
