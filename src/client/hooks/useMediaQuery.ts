/**
 * @fileType hook
 * @domain utilities
 * @pattern media-query
 * @ai-summary Subscribes to window.matchMedia changes and returns the current match state; SSR-safe (returns null until mounted)
 */

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean | null>(null)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches ?? false
}
