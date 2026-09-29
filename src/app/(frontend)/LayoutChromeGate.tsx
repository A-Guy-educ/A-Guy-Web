'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const LESSON_PATH_RE = /^\/courses\/[^/]+\/chapters\/[^/]+\/lessons\/[^/]+(?:\/|$)/

export function isChromelessRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/start' || LESSON_PATH_RE.test(pathname)
}

// Hides site chrome (Header / NavigationBar / Footer) on the lesson viewport
// and the /, /start marketing routes. Uses a client hook so it reacts to soft
// navigations — the previous server-only check kept the header hidden after a
// user exited a lesson because the shared layout's cached render still saw the
// lesson pathname.
export function LayoutChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  if (isChromelessRoute(pathname)) return null
  return <>{children}</>
}
