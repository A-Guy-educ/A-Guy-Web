/**
 * Pure KPI calculators (spec v0.4 §2). Each turns pre-fetched signals into
 * a `{ numerator, denominator }` pair for one window. Bucket-level rate
 * math lives in `metric-builder.ts` so the "no averaging of daily rates"
 * rule (§4) is applied once, at the seam between calculator and Metric.
 *
 * Visit-based KPIs return 0/0 ("no data" → null downstream) for any window
 * — including the prior window retention/churn compare against — that
 * starts before the `lesson-visits` log has full-day coverage. A partially
 * logged window would otherwise read as a real collapse in activity.
 */

import type { AllSignals, PdfVisitDay } from './signal-types'
import {
  indexUserDays,
  priorWindowLookback,
  shiftWindow,
  usersActiveIn,
  windowBoundsYmd,
  windowLengthDays,
} from './window-membership'
import { isoDate, type Window } from './windows'

export interface NumDenom {
  numerator: number
  denominator: number
}

export interface KpiOptions {
  retentionLookbackDays: number
  activeDwellSeconds: number
}

export interface KpiContext {
  activeByUser: Map<string, Set<string>>
  presentByUser: Map<string, Set<string>>
  chatByUser: Map<string, Set<string>>
  pdfVisitDays: PdfVisitDay[]
  registrationDays: string[]
  retentionLookbackDays: number
  coverageStart: string | null
}

const NO_DATA: NumDenom = { numerator: 0, denominator: 0 }

export function buildKpiContext(signals: AllSignals, options: KpiOptions): KpiContext {
  const activeDays = signals.visitDays.filter(
    (day) => day.maxPdfDwellSeconds >= options.activeDwellSeconds,
  )
  return {
    activeByUser: indexUserDays(activeDays),
    presentByUser: indexUserDays(signals.visitDays),
    chatByUser: indexUserDays(signals.chatDays),
    pdfVisitDays: signals.pdfVisitDays,
    registrationDays: signals.registrationDays,
    retentionLookbackDays: options.retentionLookbackDays,
    coverageStart: signals.visitLogCoverageStart,
  }
}

function covered(ctx: KpiContext, earliest: Date): boolean {
  return ctx.coverageStart !== null && isoDate(earliest) >= ctx.coverageStart
}

export function activeUserRate(ctx: KpiContext, window: Window): NumDenom {
  if (!covered(ctx, window.start)) return NO_DATA
  const active = usersActiveIn(ctx.activeByUser, window)
  const present = usersActiveIn(ctx.presentByUser, window)
  return { numerator: active.size, denominator: present.size }
}

export function engagementRate(ctx: KpiContext, window: Window): NumDenom {
  if (!covered(ctx, window.start)) return NO_DATA
  const active = usersActiveIn(ctx.activeByUser, window)
  const chatting = usersActiveIn(ctx.chatByUser, window)
  let engaged = 0
  for (const userId of active) if (chatting.has(userId)) engaged += 1
  return { numerator: engaged, denominator: active.size }
}

function returningFrom(ctx: KpiContext, prior: Window, window: Window) {
  const wasActive = usersActiveIn(ctx.activeByUser, prior)
  const nowActive = usersActiveIn(ctx.activeByUser, window)
  let returned = 0
  for (const userId of wasActive) if (nowActive.has(userId)) returned += 1
  return { returned, wasActive: wasActive.size }
}

/** Active in the lookback window right before `window` AND active again in it. */
export function retentionRate(ctx: KpiContext, window: Window): NumDenom {
  const prior = priorWindowLookback(window, ctx.retentionLookbackDays)
  if (!covered(ctx, prior.start)) return NO_DATA
  const { returned, wasActive } = returningFrom(ctx, prior, window)
  return { numerator: returned, denominator: wasActive }
}

/** Active in the equal-length window right before `window`, NOT active in it. */
export function inactiveChurnRate(ctx: KpiContext, window: Window): NumDenom {
  const prior = shiftWindow(window, -Math.max(1, windowLengthDays(window)))
  if (!covered(ctx, prior.start)) return NO_DATA
  const { returned, wasActive } = returningFrom(ctx, prior, window)
  return { numerator: wasActive - returned, denominator: wasActive }
}

/** PDF lesson visits with ≥1 user scroll / all PDF lesson visits. */
export function pdfScrollUsabilityRate(ctx: KpiContext, window: Window): NumDenom {
  if (!covered(ctx, window.start)) return NO_DATA
  const { startYmd, endYmd } = windowBoundsYmd(window)
  let visits = 0
  let scrolled = 0
  for (const day of ctx.pdfVisitDays) {
    if (day.date >= startYmd && day.date < endYmd) {
      visits += day.visits
      scrolled += day.scrolled
    }
  }
  return { numerator: scrolled, denominator: visits }
}

/** Eligible users whose registration falls inside the window. */
export function newRegistrations(ctx: KpiContext, window: Window): number {
  const { startYmd, endYmd } = windowBoundsYmd(window)
  return ctx.registrationDays.filter((day) => day >= startYmd && day < endYmd).length
}
