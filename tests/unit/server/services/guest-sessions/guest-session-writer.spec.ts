import { describe, expect, it } from 'vitest'

import {
  buildGoogleOutcomeUpdate,
  buildGuestSessionDoc,
} from '@/server/services/guest-sessions/guest-session-writer'

describe('buildGuestSessionDoc', () => {
  it('flags a returning browser only when told to', () => {
    expect(buildGuestSessionDoc('s1', null, { returningBrowser: true }).returningBrowser).toBe(true)
    expect(buildGuestSessionDoc('s1', null)).not.toHaveProperty('returningBrowser')
  })
})

describe('buildGoogleOutcomeUpdate', () => {
  it('stamps the outcome and its time under onboarding, last write wins', () => {
    const now = new Date('2026-11-25T08:00:00Z')
    expect(buildGoogleOutcomeUpdate('existing_login', now)).toEqual({
      $set: { 'onboarding.googleOutcome': 'existing_login', 'onboarding.googleOutcomeAt': now },
    })
  })
})
