import { describe, expect, it } from 'vitest'

import { isRealPaywall } from '@/client/hooks/usePaywallBeacon'

describe('isRealPaywall', () => {
  it('waits for the user to load — the exercise lock flashes until then', () => {
    expect(isRealPaywall('exercise', null, true)).toBe(false)
    expect(isRealPaywall('ai_quota', null, true)).toBe(false)
  })

  it('records the exercise lock only for students below the paid tiers', () => {
    expect(isRealPaywall('exercise', { currentTier: 'free' }, false)).toBe(true)
    expect(isRealPaywall('exercise', { currentTier: null }, false)).toBe(true)
    expect(isRealPaywall('exercise', { currentTier: 'basic' }, false)).toBe(false)
    expect(isRealPaywall('exercise', { currentTier: 'premium' }, false)).toBe(false)
  })

  it('records the AI quota wall on any tier', () => {
    expect(isRealPaywall('ai_quota', { currentTier: 'premium' }, false)).toBe(true)
  })
})
