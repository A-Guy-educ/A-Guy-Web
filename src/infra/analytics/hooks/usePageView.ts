/**
 * @ai-summary Auto-tracks page views by emitting systemEventBus.PAGE_VIEWED on Next.js route changes.
 *
 * CRITICAL: Use in only ONE place (root layout) — multiple instances cause duplicate events.
 */

'use client'

import { SYSTEM_EVENTS, systemEventBus } from '@/infra/system-events'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Hook to automatically track page views
 *
 * Usage:
 * ```tsx
 * // In app layout ONLY
 * export default function RootLayout({ children }) {
 *   usePageView() // Tracks page views automatically
 *   return <>{children}</>
 * }
 * ```
 *
 * DO NOT use in multiple components - will cause duplicate events
 */
export function usePageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page view on route change via system event bus
    systemEventBus.emit(SYSTEM_EVENTS.PAGE_VIEWED, {
      page_path: pathname,
      page_search: searchParams.toString(),
      page_title: typeof document !== 'undefined' ? document.title : undefined,
    })
  }, [pathname, searchParams])
}
