import { describe, expect, it } from 'vitest'

import { buildOnboardingStepUpdate } from '@/server/services/guest-sessions/guest-session-events'

describe('buildOnboardingStepUpdate', () => {
  it('stamps the step and startedAt with first-write-wins $min', () => {
    expect(buildOnboardingStepUpdate('gradeSelected', null)).toEqual([
      {
        $set: {
          'onboarding.startedAt': { $min: ['$onboarding.startedAt', '$$NOW'] },
          'onboarding.gradeSelectedAt': { $min: ['$onboarding.gradeSelectedAt', '$$NOW'] },
        },
      },
    ])
  })

  it('keeps the first trigger and stores the new one as a literal', () => {
    const [stage] = buildOnboardingStepUpdate('signupPromptShown', { type: 'lesson', id: 'l1' })
    expect((stage?.$set as Record<string, unknown>)['onboarding.trigger']).toEqual({
      $ifNull: ['$onboarding.trigger', { $literal: { type: 'lesson', id: 'l1' } }],
    })
  })

  it('only touches onboarding.* fields (never claimedByUser or landing data)', () => {
    const [stage] = buildOnboardingStepUpdate('googleClicked', { type: 'course', id: 'c1' })
    for (const key of Object.keys(stage?.$set as object)) {
      expect(key.startsWith('onboarding.')).toBe(true)
    }
  })
})
