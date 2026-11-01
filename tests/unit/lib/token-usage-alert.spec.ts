import { describe, expect, it } from 'vitest'

import {
  pickTokenUsageAlert,
  tokenUsageAlertKey,
  type TokenUsageSnapshot,
} from '@/lib/tiers/token-usage-alert'

const DAY_RESET = '2026-11-02T00:00:00.000Z'
const MONTH_RESET = '2026-12-01T00:00:00.000Z'

function usage(dailyUsed: number, monthlyUsed: number): TokenUsageSnapshot {
  return {
    daily: { used: dailyUsed, limit: 1000, resetAt: DAY_RESET },
    monthly: { used: monthlyUsed, limit: 10000, resetAt: MONTH_RESET },
  }
}

const nothingSeen = () => false

describe('pickTokenUsageAlert', () => {
  it('stays quiet below 50%', () => {
    expect(pickTokenUsageAlert(usage(499, 4999), nothingSeen)).toBeNull()
  })

  it('alerts at 50% of the daily window', () => {
    expect(pickTokenUsageAlert(usage(500, 0), nothingSeen)).toEqual({
      window: 'daily',
      threshold: 50,
      resetAt: DAY_RESET,
      keys: [tokenUsageAlertKey('daily', 50, DAY_RESET)],
    })
  })

  it('jumping past 90% shows only the 90% alert and retires the 50% one', () => {
    const alert = pickTokenUsageAlert(usage(950, 0), nothingSeen)
    expect(alert?.threshold).toBe(90)
    expect(alert?.keys).toEqual([
      tokenUsageAlertKey('daily', 90, DAY_RESET),
      tokenUsageAlertKey('daily', 50, DAY_RESET),
    ])
  })

  it('prefers the higher threshold, then monthly over daily', () => {
    expect(pickTokenUsageAlert(usage(600, 9500), nothingSeen)).toMatchObject({
      window: 'monthly',
      threshold: 90,
    })
    expect(pickTokenUsageAlert(usage(600, 6000), nothingSeen)).toMatchObject({
      window: 'monthly',
      threshold: 50,
    })
  })

  it('skips seen alerts and moves on to the next one', () => {
    const seen = new Set([tokenUsageAlertKey('monthly', 50, MONTH_RESET)])
    expect(pickTokenUsageAlert(usage(600, 6000), (k) => seen.has(k))).toMatchObject({
      window: 'daily',
      threshold: 50,
    })
  })

  it('re-arms when the window resets', () => {
    const seen = new Set([tokenUsageAlertKey('daily', 50, DAY_RESET)])
    const nextDay: TokenUsageSnapshot = {
      ...usage(0, 0),
      daily: { used: 500, limit: 1000, resetAt: '2026-11-03T00:00:00.000Z' },
    }
    expect(pickTokenUsageAlert(nextDay, (k) => seen.has(k))).toMatchObject({ window: 'daily' })
  })

  it('ignores uncapped and exhausted windows', () => {
    const uncapped: TokenUsageSnapshot = {
      daily: { used: 900, limit: null, resetAt: null },
      monthly: { used: 10000, limit: 10000, resetAt: MONTH_RESET },
    }
    expect(pickTokenUsageAlert(uncapped, nothingSeen)).toBeNull()
  })
})
