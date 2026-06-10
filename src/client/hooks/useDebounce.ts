/**
 * @fileType hook
 * @domain utilities
 * @pattern debounce
 * @ai-summary Delays propagating a value until it has stopped changing for delay ms; clears pending timeout on each change
 */

import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
