/**
 * @fileType hook
 * @domain exercise-renderer
 * @ai-summary Collapses the authored `displaySize` to `'full'` on mobile
 *             viewports. Authored sizes are tuned for a wide desktop canvas —
 *             the common `'medium'` (50%) renders fine on a laptop but is
 *             barely legible on a phone. Any viewport under the Tailwind md
 *             breakpoint overrides the authored value to 'full'; wider
 *             viewports pass through unchanged. Used by GeometryRenderer,
 *             AxisRenderer, and SvgRenderer — all three share the same
 *             DisplaySize union, so one hook covers them.
 */

'use client'

import { useMediaQuery } from '@/client/hooks/useMediaQuery'

type DisplaySize = 'small' | 'medium' | 'large' | 'full'

const MOBILE_QUERY = '(max-width: 767px)'

export function useEffectiveDisplaySize(
  displaySize: DisplaySize | undefined,
): DisplaySize | undefined {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  if (!displaySize) return displaySize
  return isMobile ? 'full' : displaySize
}
