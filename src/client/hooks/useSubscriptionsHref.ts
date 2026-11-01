'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { subscriptionsHref } from '@/lib/tiers/subscribe-return'

/**
 * `/subscriptions?returnTo=<this page>` for upsell links, so checkout can
 * send the student back to where they hit the wall.
 *
 * The query string (`?exerciseId=`, `?block=`) is read after mount rather
 * than through `useSearchParams`, which would force a Suspense boundary on
 * every page that renders an upsell link.
 */
export function useSubscriptionsHref(): string {
  const pathname = usePathname()
  const [search, setSearch] = useState('')

  useEffect(() => {
    setSearch(window.location.search)
  }, [pathname])

  return subscriptionsHref(pathname ? `${pathname}${search}` : null)
}
