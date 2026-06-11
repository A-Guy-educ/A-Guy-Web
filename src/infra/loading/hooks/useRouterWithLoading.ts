'use client'

/**
 * @ai-summary Wraps Next.js useRouter with loading state registration — call push/replace
 * instead of the raw router. Registers ROUTE_TRANSITION key before navigation and unregisters
 * it via RouteLoadingIndicator when the pathname or searchParams change.
 *
 * @ai-trap Loading is unregistered by RouteLoadingIndicator watching pathname/searchParams,
 * not by the router itself — if RouteLoadingIndicator is not mounted the key leaks.
 * Same-page hash navigation is intentionally skipped (no loading shown).
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { loadingManager } from '../LoadingManager'
import { LOADING_KEYS } from '../keys'
import { resolveHrefToString, buildCurrentPath } from '../utils/resolveHref'

/**
 * Router hook that registers route loading at trigger time
 * Use this instead of useRouter for programmatic navigation with loading indicators
 */
export function useRouterWithLoading() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) => {
      // Normalize both paths for reliable comparison (ignore hash - same-page anchor)
      const targetPath = resolveHrefToString(href, true)
      const currentPath = buildCurrentPath(pathname, searchParams)

      // Only register loading if actually navigating to different page
      if (currentPath !== targetPath) {
        loadingManager.register(LOADING_KEYS.ROUTE_TRANSITION, 'route')
      }

      router.push(href, options)
    },
    [router, pathname, searchParams],
  )

  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) => {
      // Normalize both paths for reliable comparison (ignore hash - same-page anchor)
      const targetPath = resolveHrefToString(href, true)
      const currentPath = buildCurrentPath(pathname, searchParams)

      if (currentPath !== targetPath) {
        loadingManager.register(LOADING_KEYS.ROUTE_TRANSITION, 'route')
      }

      router.replace(href, options)
    },
    [router, pathname, searchParams],
  )

  return useMemo(
    () => ({
      ...router,
      push,
      replace,
    }),
    [router, push, replace],
  )
}
