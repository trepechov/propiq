'use client'

/**
 * TableFilterBar — renders text search, enum multi-selects, number inputs, and date inputs.
 *
 * Designed to sit above any data table. Controlled component — all state
 * lives in the parent via the useTableFilter hook.
 */

import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type {
  FilterConfig,
  FilterState,
  EnumFilterConfig,
} from '@/hooks/useTableFilter'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props<T> {
  configs: FilterConfig<T>[]
  filterState: FilterState
  onTextChange: (text: string) => void
  onEnumChange: (field: string, values: string[]) => void
  onNumberChange: (field: string, value: string) => void
  onDateChange: (field: string, value: string) => void
  onClear: () => void
  isFiltered: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TableFilterBar<T>({
  configs,
  filterState,
  onTextChange,
  onEnumChange,
  onNumberChange,
  onDateChange,
  onClear,
  isFiltered,
}: Props<T>) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {configs.map((config, i) => {
          if (config.type === 'text') {
            return (
              <TextField
                key={i}
                size="small"
                placeholder="Search…"
                value={filterState.text}
                onChange={e => onTextChange(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 200 }}
              />
            )
          }
          if (config.type === 'enum') {
            return (
              <EnumSelect
                key={String(config.field)}
                config={config as EnumFilterConfig<T>}
                selected={filterState.enums[String(config.field)] ?? []}
                onChange={values => onEnumChange(String(config.field), values)}
              />
            )
          }
          if (config.type === 'maxNumber' || config.type === 'exactNumber') {
            return (
              <TextField
                key={String(config.field)}
                size="small"
                label={config.label}
                type="number"
                placeholder={config.placeholder}
                value={filterState.numbers[String(config.field)] ?? ''}
                onChange={e => onNumberChange(String(config.field), e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
                sx={{ width: 150, }}
              />
            )
          }
          if (config.type === 'maxDate') {
            return (
              <TextField
                key={String(config.field)}
                size="small"
                label={config.label}
                type="month"
                value={filterState.dates[String(config.field)] ?? ''}
                onChange={e => onDateChange(String(config.field), e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 160 }}
              />
            )
          }
          return null
        })}

        {isFiltered && (
          <Button size="small" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </Stack>
    </Box>
  )
}

// ── EnumSelect sub-component ──────────────────────────────────────────────────

interface EnumSelectProps<T> {
  config: EnumFilterConfig<T>
  selected: string[]
  onChange: (values: string[]) => void
}

function EnumSelect<T>({ config, selected, onChange }: EnumSelectProps<T>) {
  function handleChange(event: SelectChangeEvent<string[]>) {
    const value = event.target.value
    onChange(typeof value === 'string' ? value.split(',') : value)
  }

  function renderValue(selectedValues: string[]) {
    if (selectedValues.length === 0) return `All ${config.label}s`
    return `${config.label}: ${selectedValues.length}`
  }

  return (
    <Select<string[]>
      multiple
      size="small"
      displayEmpty
      value={selected}
      onChange={handleChange}
      renderValue={renderValue}
      sx={{ minWidth: 150 }}
    >
      {config.options.map(opt => (
        <MenuItem key={opt.value} value={opt.value}>
          <Checkbox checked={selected.includes(opt.value)} size="small" />
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  )
}
