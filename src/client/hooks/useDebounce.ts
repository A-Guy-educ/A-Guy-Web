/**
 * @fileType hook
 * @domain frontend
 * @ai-summary Delays propagating a value by `delay` ms — useful to throttle rapid user input before triggering expensive operations like search or validation.
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
