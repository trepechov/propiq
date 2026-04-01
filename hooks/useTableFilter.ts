/**
 * useTableFilter — generic hook for text + enum + numeric + date filtering on any row array.
 *
 * Text filter: case-insensitive substring match across configured fields (OR).
 * Enum filter: row must match one of the selected values per field (AND across fields).
 * MaxNumber filter: row field value must be <= the input number.
 * ExactNumber filter: row field value must === the input integer.
 * MaxDate filter: row field ISO date string must be <= the input YYYY-MM string.
 * All active filters combine with AND logic.
 *
 * Constraint is `T extends object` (not `Record<string, unknown>`) so that
 * TypeScript interfaces — which lack an index signature — satisfy the bound.
 * Internal field access uses `as Record<string, unknown>` casts only where needed.
 */

import { useState, useMemo } from 'react'
import { useDebounce } from './useDebounce'

// ── Filter config types ───────────────────────────────────────────────────────

export type TextFilterConfig<T> = {
  type: 'text'
  /** Search across these fields — matches if ANY field contains the text (OR). */
  fields: (keyof T)[]
}

export type EnumFilterConfig<T> = {
  type: 'enum'
  field: keyof T
  /** Label shown in the filter bar UI (e.g. "Stage", "Status"). */
  label: string
  options: { value: string; label: string }[]
}

/** Numeric filter: keeps rows where field value <= input number. */
export type MaxNumberFilterConfig<T> = {
  type: 'maxNumber'
  field: keyof T
  label: string
  placeholder?: string
}

/** Numeric filter: keeps rows where field value === input integer (exact match). */
export type ExactNumberFilterConfig<T> = {
  type: 'exactNumber'
  field: keyof T
  label: string
  placeholder?: string
}

/** Date filter: keeps rows where field ISO date string <= input YYYY-MM string. */
export type MaxDateFilterConfig<T> = {
  type: 'maxDate'
  field: keyof T
  label: string
}

export type FilterConfig<T> =
  | TextFilterConfig<T>
  | EnumFilterConfig<T>
  | MaxNumberFilterConfig<T>
  | ExactNumberFilterConfig<T>
  | MaxDateFilterConfig<T>

// ── Filter state ──────────────────────────────────────────────────────────────

export type FilterState = {
  text: string
  /** Maps field name (as string) → selected enum values. Empty array = no filter. */
  enums: Record<string, string[]>
  /** Maps field name (as string) → raw string input. Empty string = no filter. */
  numbers: Record<string, string>
  /** Maps field name (as string) → date string (YYYY-MM). Empty string = no filter. */
  dates: Record<string, string>
}

const EMPTY_FILTER_STATE: FilterState = { text: '', enums: {}, numbers: {}, dates: {} }

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTableFilter<T extends object>(
  rows: T[],
  configs: FilterConfig<T>[],
): {
  filterState: FilterState
  setTextFilter: (text: string) => void
  setEnumFilter: (field: string, values: string[]) => void
  setNumberFilter: (field: string, value: string) => void
  setDateFilter: (field: string, value: string) => void
  clearFilters: () => void
  filteredRows: T[]
  isFiltered: boolean
} {
  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER_STATE)

  // Debounce free-text and number inputs so the filter computation only runs
  // after the user pauses typing. Enum selects and date pickers are deliberate
  // actions and remain immediate (filterState.enums / filterState.dates are
  // used directly in the memo below).
  const debouncedText    = useDebounce(filterState.text, 300)
  const debouncedNumbers = useDebounce(filterState.numbers, 300)
  const debouncedEnums   = useDebounce(filterState.enums, 300)

  function setTextFilter(text: string) {
    setFilterState(prev => ({ ...prev, text }))
  }

  function setEnumFilter(field: string, values: string[]) {
    setFilterState(prev => ({ ...prev, enums: { ...prev.enums, [field]: values } }))
  }

  function setNumberFilter(field: string, value: string) {
    setFilterState(prev => ({ ...prev, numbers: { ...prev.numbers, [field]: value } }))
  }

  function setDateFilter(field: string, value: string) {
    setFilterState(prev => ({ ...prev, dates: { ...prev.dates, [field]: value } }))
  }

  function clearFilters() {
    setFilterState(EMPTY_FILTER_STATE)
  }

  const isFiltered =
    filterState.text.trim() !== '' ||
    Object.values(filterState.enums).some(v => v.length > 0) ||
    Object.values(filterState.numbers).some(v => v !== '') ||
    Object.values(filterState.dates).some(v => v !== '')

  const filteredRows = useMemo(
    () => applyFilters(rows, configs, {
      ...filterState,
      text:    debouncedText,
      enums:   debouncedEnums,
      numbers: debouncedNumbers,
    }),
    [rows, configs, filterState, debouncedText, debouncedEnums, debouncedNumbers],
  )

  return {
    filterState,
    setTextFilter,
    setEnumFilter,
    setNumberFilter,
    setDateFilter,
    clearFilters,
    filteredRows,
    isFiltered,
  }
}

// ── Filter logic (pure) ───────────────────────────────────────────────────────

function applyFilters<T extends object>(
  rows: T[],
  configs: FilterConfig<T>[],
  state: FilterState,
): T[] {
  return rows.filter(row =>
    matchesText(row, configs, state.text) &&
    matchesEnums(row, state.enums) &&
    matchesNumbers(row, configs, state.numbers) &&
    matchesDates(row, state.dates),
  )
}

function matchesText<T extends object>(
  row: T,
  configs: FilterConfig<T>[],
  text: string,
): boolean {
  const query = text.trim().toLowerCase()
  if (query === '') return true

  const textConfig = configs.find((c): c is TextFilterConfig<T> => c.type === 'text')
  if (!textConfig) return true

  const record = row as Record<string, unknown>
  return textConfig.fields.some(field => {
    const value = record[field as string]
    if (value === null || value === undefined) return false
    return String(value).toLowerCase().includes(query)
  })
}

function matchesEnums<T extends object>(
  row: T,
  enums: Record<string, string[]>,
): boolean {
  const record = row as Record<string, unknown>
  return Object.entries(enums).every(([field, selected]) => {
    if (selected.length === 0) return true
    const value = record[field]
    // null/undefined values never match a selected enum filter
    if (value === null || value === undefined) return false
    return selected.includes(String(value))
  })
}

function matchesNumbers<T extends object>(
  row: T,
  configs: FilterConfig<T>[],
  numbers: Record<string, string>,
): boolean {
  const record = row as Record<string, unknown>
  return Object.entries(numbers).every(([field, input]) => {
    if (input === '') return true

    const config = configs.find(
      (c): c is MaxNumberFilterConfig<T> | ExactNumberFilterConfig<T> =>
        (c.type === 'maxNumber' || c.type === 'exactNumber') && String(c.field) === field,
    )
    const fieldValue = record[field]
    if (fieldValue === null || fieldValue === undefined) return false

    if (config?.type === 'maxNumber') {
      const threshold = parseFloat(input)
      if (isNaN(threshold)) return true
      return (fieldValue as number) <= threshold
    }

    if (config?.type === 'exactNumber') {
      const target = parseInt(input, 10)
      if (isNaN(target)) return true
      return (fieldValue as number) === target
    }

    return true
  })
}

function matchesDates<T extends object>(
  row: T,
  dates: Record<string, string>,
): boolean {
  const record = row as Record<string, unknown>
  return Object.entries(dates).every(([field, input]) => {
    if (input === '') return true
    const fieldValue = record[field]
    if (fieldValue === null || fieldValue === undefined) return false
    // ISO 8601 string comparison works for YYYY-MM-DD vs YYYY-MM prefix
    return String(fieldValue) <= input
  })
}
