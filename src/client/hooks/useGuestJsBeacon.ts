/**
 * @fileType hook
 * @domain analytics
 * @pattern anonymous-tracking
 * @ai-summary Fires one "this visitor runs JS" beacon per tab session for
 * anonymous visitors, clearing `suspectedBot` on their guest-session doc.
 *
 * Gotcha: the beacon waits a moment after hydration so it doesn't race the
 * middleware's after() insert on a first landing. If it still loses the race
 * the server answers `recorded: false` and the next full page load retries.
 */

'use client'

import { useEffect } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { confirmGuestJs } from '@/client/utils/guest-session-beacon'

const CONFIRMED_KEY = 'aguy_guest_js_confirmed'
const BEACON_DELAY_MS = 1500

function readConfirmed(): boolean {
  try {
    return window.sessionStorage.getItem(CONFIRMED_KEY) === '1'
  } catch {
    return false
  }
}

function writeConfirmed(): void {
  try {
    window.sessionStorage.setItem(CONFIRMED_KEY, '1')
  } catch {
    // Storage blocked — the server write is idempotent, so a repeat is harmless.
  }
}

export function useGuestJsBeacon(): void {
  const { user, isLoading } = useCurrentUser()
  const isAnonymous = !user && !isLoading

  useEffect(() => {
    if (!isAnonymous || readConfirmed()) return
    const timer = window.setTimeout(() => {
      void confirmGuestJs().then((recorded) => {
        if (recorded) writeConfirmed()
      })
    }, BEACON_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isAnonymous])
}
