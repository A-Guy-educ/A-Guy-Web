'use client'

import { useEffect, useState } from 'react'

import type { TokenUsageSnapshot, TokenUsageWindowSnapshot } from '@/lib/tiers/token-usage-alert'

const USAGE_ENDPOINT = '/api/users/me/token-usage'

export function getUsagePercent({ used, limit }: TokenUsageWindowSnapshot): number | null {
  if (limit === null || limit <= 0) return null
  return Math.min(100, Math.round((used / limit) * 100))
}

/** Monthly budget used, loaded while `enabled`. Null when unlimited or unavailable. */
export function useMonthlyTokenUsagePercent(enabled: boolean): number | null {
  const [percent, setPercent] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    let isCancelled = false

    async function load() {
      try {
        const res = await fetch(USAGE_ENDPOINT, { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const body = (await res.json()) as { success?: boolean; data?: TokenUsageSnapshot }
        if (!isCancelled && body.success && body.data) {
          setPercent(getUsagePercent(body.data.monthly))
        }
      } catch {
        // The meter is informational — a failed read just leaves it hidden.
      }
    }

    void load()
    return () => {
      isCancelled = true
    }
  }, [enabled])

  return percent
}
