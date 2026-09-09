/**
 * Pure KPI calculators (spec §2). Each turns pre-fetched signals into a
 * `{ numerator, denominator }` pair for one window. Bucket-level rate
 * math lives in `metric-builder.ts` so the "no averaging of daily rates"
 * rule (§4) is applied once, at the seam between calculator and Metric.
 */

import type { AllSignals, LessonAttempt } from './signal-types'
import {
  indexUserDays,
  priorWindowLookback,
  shiftWindow,
  usersActiveIn,
  windowBoundsYmd,
  windowLengthDays,
} from './window-membership'
import type { Window } from './windows'

export interface NumDenom {
  numerator: number
  denominator: number
}

export interface KpiContext {
  lessonActiveByUser: Map<string, Set<string>>
  chatByUser: Map<string, Set<string>>
  attempts: LessonAttempt[]
  identifiedCreatedAt: Map<string, Date>
  retentionLookbackDays: number
}

export function buildKpiContext(signals: AllSignals, retentionLookbackDays: number): KpiContext {
  return {
    lessonActiveByUser: indexUserDays(signals.lessonActiveDays),
    chatByUser: indexUserDays(signals.chatDays),
    attempts: signals.lessonAttempts,
    identifiedCreatedAt: signals.population.createdAt,
    retentionLookbackDays,
  }
}

function countIdentifiedBefore(ctx: KpiContext, end: Date): number {
  let n = 0
  for (const createdAt of ctx.identifiedCreatedAt.values()) {
    if (createdAt < end) n += 1
  }
  return n
}

export function activeUserRate(ctx: KpiContext, window: Window): NumDenom {
  const active = usersActiveIn(ctx.lessonActiveByUser, window)
  return { numerator: active.size, denominator: countIdentifiedBefore(ctx, window.end) }
}

export function engagementRate(ctx: KpiContext, window: Window): NumDenom {
  const active = usersActiveIn(ctx.lessonActiveByUser, window)
  const chatting = usersActiveIn(ctx.chatByUser, window)
  let engaged = 0
  for (const userId of active) if (chatting.has(userId)) engaged += 1
  return { numerator: engaged, denominator: active.size }
}

export function retentionRate(ctx: KpiContext, window: Window): NumDenom {
  const prior = priorWindowLookback(window, ctx.retentionLookbackDays)
  const wasActive = usersActiveIn(ctx.lessonActiveByUser, prior)
  const nowActive = usersActiveIn(ctx.lessonActiveByUser, window)
  let retained = 0
  for (const userId of wasActive) if (nowActive.has(userId)) retained += 1
  return { numerator: retained, denominator: wasActive.size }
}

export function inactiveChurnRate(ctx: KpiContext, window: Window): NumDenom {
  const length = Math.max(1, windowLengthDays(window))
  const prior = shiftWindow(window, -length)
  const wasActive = usersActiveIn(ctx.lessonActiveByUser, prior)
  const nowActive = usersActiveIn(ctx.lessonActiveByUser, window)
  let churned = 0
  for (const userId of wasActive) if (!nowActive.has(userId)) churned += 1
  return { numerator: churned, denominator: wasActive.size }
}

export function lessonCompletionRate(ctx: KpiContext, window: Window): NumDenom {
  const { startYmd, endYmd } = windowBoundsYmd(window)
  let started = 0
  let completed = 0
  for (const attempt of ctx.attempts) {
    if (attempt.date >= startYmd && attempt.date < endYmd) {
      started += 1
      if (attempt.completed) completed += 1
    }
  }
  return { numerator: completed, denominator: started }
}
