import { describe, expect, it } from 'vitest'

import {
  activeUserRate,
  buildKpiContext,
  engagementRate,
  inactiveChurnRate,
  lessonCompletionRate,
  retentionRate,
  type KpiContext,
} from '@/server/services/dashboard/product-health/kpi-calculators'
import type {
  AllSignals,
  LessonAttempt,
  UserDay,
} from '@/server/services/dashboard/product-health/signal-types'
import type { Window } from '@/server/services/dashboard/product-health/windows'

const window: Window = {
  start: new Date('2026-03-01T00:00:00.000Z'),
  end: new Date('2026-03-08T00:00:00.000Z'),
}

function context(overrides: Partial<AllSignals> = {}, lookbackDays = 30): KpiContext {
  const signals: AllSignals = {
    lessonActiveDays: [],
    chatDays: [],
    lessonAttempts: [],
    population: { createdAt: new Map() },
    ...overrides,
  }
  return buildKpiContext(signals, lookbackDays)
}

describe('activeUserRate', () => {
  it('counts distinct active users over identified users with createdAt < window.end', () => {
    const lessonActiveDays: UserDay[] = [
      { userId: 'u1', date: '2026-03-02' },
      { userId: 'u1', date: '2026-03-04' }, // deduped
      { userId: 'u2', date: '2026-03-07' },
      { userId: 'u3', date: '2026-02-28' }, // before window
    ]
    const createdAt = new Map<string, Date>([
      ['u1', new Date('2026-01-01T00:00:00.000Z')],
      ['u2', new Date('2026-01-15T00:00:00.000Z')],
      ['u3', new Date('2026-02-01T00:00:00.000Z')],
      ['u4', new Date('2026-03-09T00:00:00.000Z')], // registered after window end → excluded
    ])
    const ctx = context({ lessonActiveDays, population: { createdAt } })
    expect(activeUserRate(ctx, window)).toEqual({ numerator: 2, denominator: 3 })
  })

  it('returns denominator=0 when there are no identified users', () => {
    expect(activeUserRate(context(), window)).toEqual({ numerator: 0, denominator: 0 })
  })
})

describe('engagementRate', () => {
  it('only counts chatting users who are also active', () => {
    const lessonActiveDays: UserDay[] = [
      { userId: 'u1', date: '2026-03-02' },
      { userId: 'u2', date: '2026-03-03' },
    ]
    const chatDays: UserDay[] = [
      { userId: 'u1', date: '2026-03-02' },
      { userId: 'u9', date: '2026-03-04' }, // chatted but not active — excluded
    ]
    const ctx = context({ lessonActiveDays, chatDays })
    expect(engagementRate(ctx, window)).toEqual({ numerator: 1, denominator: 2 })
  })
})

describe('retentionRate', () => {
  it('measures users active in the prior 30d lookback who are also active in the current window', () => {
    const lessonActiveDays: UserDay[] = [
      // u1 active in prior AND current
      { userId: 'u1', date: '2026-02-10' },
      { userId: 'u1', date: '2026-03-03' },
      // u2 active in prior only
      { userId: 'u2', date: '2026-02-01' },
      // u3 active in current only
      { userId: 'u3', date: '2026-03-05' },
    ]
    const ctx = context({ lessonActiveDays }, 30)
    expect(retentionRate(ctx, window)).toEqual({ numerator: 1, denominator: 2 })
  })
})

describe('inactiveChurnRate', () => {
  it('measures users active in the equal-length prior window who are NOT active in the current window', () => {
    // Prior window is 7d immediately before the current one → 2026-02-22..2026-03-01
    const lessonActiveDays: UserDay[] = [
      { userId: 'u1', date: '2026-02-25' }, // prior only → churned
      { userId: 'u2', date: '2026-02-27' }, // prior + current → retained
      { userId: 'u2', date: '2026-03-02' },
      { userId: 'u3', date: '2026-03-04' }, // current only → not counted
    ]
    const ctx = context({ lessonActiveDays })
    expect(inactiveChurnRate(ctx, window)).toEqual({ numerator: 1, denominator: 2 })
  })
})

describe('lessonCompletionRate', () => {
  it('counts completed lesson records over all lesson records touched in the window', () => {
    const lessonAttempts: LessonAttempt[] = [
      { date: '2026-03-01', completed: true },
      { date: '2026-03-02', completed: false },
      { date: '2026-03-02', completed: true },
      { date: '2026-02-28', completed: true }, // before window → excluded
      { date: '2026-03-08', completed: true }, // on the exclusive boundary → excluded
    ]
    const ctx = context({ lessonAttempts })
    expect(lessonCompletionRate(ctx, window)).toEqual({ numerator: 2, denominator: 3 })
  })
})
