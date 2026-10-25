import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTierContentLocksEnabled, isTierSpendingLimitsEnabled } from '@/lib/tiers/enforcement'

describe('tier enforcement switches', () => {
  beforeEach(() => {
    vi.stubEnv('TIER_SPENDING_LIMITS_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('defaults both switches off', () => {
    expect(isTierSpendingLimitsEnabled()).toBe(false)
    expect(isTierContentLocksEnabled()).toBe(false)
  })

  it('turns on spending limits without content locks', () => {
    vi.stubEnv('TIER_SPENDING_LIMITS_ENABLED', 'on')
    expect(isTierSpendingLimitsEnabled()).toBe(true)
    expect(isTierContentLocksEnabled()).toBe(false)
  })

  it('turns on content locks without spending limits', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', 'true')
    expect(isTierContentLocksEnabled()).toBe(true)
    expect(isTierSpendingLimitsEnabled()).toBe(false)
  })

  it('falls back to the legacy combined switch when the new vars are unset', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED', 'on')
    expect(isTierSpendingLimitsEnabled()).toBe(true)
    expect(isTierContentLocksEnabled()).toBe(true)
  })

  it('lets an explicit new value override the legacy switch', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED', 'on')
    vi.stubEnv('TIER_SPENDING_LIMITS_ENABLED', 'off')
    expect(isTierSpendingLimitsEnabled()).toBe(false)
    expect(isTierContentLocksEnabled()).toBe(true)
  })
})
