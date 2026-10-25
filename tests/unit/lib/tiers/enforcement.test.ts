import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isTierContentLocksEnabled,
  isTierLearningLocksEnabled,
  isTierPracticeExamLocksEnabled,
  isTierSpendingLimitsEnabled,
} from '@/lib/tiers/enforcement'

describe('tier enforcement switches', () => {
  beforeEach(() => {
    vi.stubEnv('TIER_SPENDING_LIMITS_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_TIER_LEARNING_LOCKS_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', '')
    vi.stubEnv('NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('defaults every switch off', () => {
    expect(isTierSpendingLimitsEnabled()).toBe(false)
    expect(isTierLearningLocksEnabled()).toBe(false)
    expect(isTierPracticeExamLocksEnabled()).toBe(false)
    expect(isTierContentLocksEnabled()).toBe(false)
  })

  it('turns on spending limits without content locks', () => {
    vi.stubEnv('TIER_SPENDING_LIMITS_ENABLED', 'on')
    expect(isTierSpendingLimitsEnabled()).toBe(true)
    expect(isTierContentLocksEnabled()).toBe(false)
  })

  it('turns on learning locks alone, which still enables the opened-lessons ledger', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_LEARNING_LOCKS_ENABLED', 'true')
    expect(isTierLearningLocksEnabled()).toBe(true)
    expect(isTierPracticeExamLocksEnabled()).toBe(false)
    expect(isTierContentLocksEnabled()).toBe(true)
    expect(isTierSpendingLimitsEnabled()).toBe(false)
  })

  it('turns on practice/exam locks alone', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED', 'yes')
    expect(isTierPracticeExamLocksEnabled()).toBe(true)
    expect(isTierLearningLocksEnabled()).toBe(false)
    expect(isTierContentLocksEnabled()).toBe(true)
  })

  it('falls back to the combined content-locks switch when the split vars are unset', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', 'on')
    expect(isTierLearningLocksEnabled()).toBe(true)
    expect(isTierPracticeExamLocksEnabled()).toBe(true)
    expect(isTierSpendingLimitsEnabled()).toBe(false)
  })

  it('falls back to the legacy switch when nothing newer is set', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED', 'on')
    expect(isTierSpendingLimitsEnabled()).toBe(true)
    expect(isTierLearningLocksEnabled()).toBe(true)
    expect(isTierPracticeExamLocksEnabled()).toBe(true)
  })

  it('lets an explicit split value override the fallbacks', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', 'on')
    vi.stubEnv('NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED', 'false')
    expect(isTierLearningLocksEnabled()).toBe(true)
    expect(isTierPracticeExamLocksEnabled()).toBe(false)
  })
})
