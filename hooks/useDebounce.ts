import { useEffect, useState } from 'react'

/**
 * Delays propagating a value until it stops changing for `delayMs` milliseconds.
 * Useful for deferring expensive operations (e.g. filtering) while keeping
 * controlled inputs feeling immediately responsive.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
