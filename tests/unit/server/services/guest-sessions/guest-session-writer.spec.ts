import { describe, expect, it } from 'vitest'

import { buildGoogleOutcomeUpdate } from '@/server/services/guest-sessions/guest-session-writer'

describe('buildGoogleOutcomeUpdate', () => {
  it('stamps the outcome and its time under onboarding, last write wins', () => {
    const now = new Date('2026-11-25T08:00:00Z')
    expect(buildGoogleOutcomeUpdate('existing_login', now)).toEqual({
      $set: { 'onboarding.googleOutcome': 'existing_login', 'onboarding.googleOutcomeAt': now },
    })
  })
})
