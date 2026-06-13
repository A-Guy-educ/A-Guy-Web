/**
 * @fileType hook
 * @domain frontend
 * @ai-summary Tracks `window.matchMedia` query matches reactively — initial state is `null` (SSR-safe), then `false` until the media query matches.
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
