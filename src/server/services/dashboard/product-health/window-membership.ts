/**
 * Window-membership helpers used by the KPI calculators.
 *
 * All windows are half-open [start, end). We keep the "was user active in
 * window?" check as string comparison against YYYY-MM-DD keys — that's
 * what the signal fetchers project, so no per-check date parsing.
 */

import type { UserDay } from './signal-types'
import { isoDate, type Window } from './windows'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function shiftWindow({ start, end }: Window, offsetDays: number): Window {
  return {
    start: new Date(start.getTime() + offsetDays * MS_PER_DAY),
    end: new Date(end.getTime() + offsetDays * MS_PER_DAY),
  }
}

/** The N-day window ending at `window.start`. Used for retention lookback. */
export function priorWindowLookback(window: Window, lookbackDays: number): Window {
  return {
    start: new Date(window.start.getTime() - lookbackDays * MS_PER_DAY),
    end: window.start,
  }
}

export function windowLengthDays({ start, end }: Window): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

/** [start, end) as YMD strings. `end` stays exclusive after conversion. */
export function windowBoundsYmd(window: Window): { startYmd: string; endYmd: string } {
  return { startYmd: isoDate(window.start), endYmd: isoDate(window.end) }
}

/** Bundle per-user activity days into a lookup Map for O(1) fetch. */
export function indexUserDays(days: UserDay[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const day of days) {
    let bucket = map.get(day.userId)
    if (!bucket) {
      bucket = new Set()
      map.set(day.userId, bucket)
    }
    bucket.add(day.date)
  }
  return map
}

/** Distinct userIds who have at least one day inside the window. */
export function usersActiveIn(days: Map<string, Set<string>>, window: Window): Set<string> {
  const { startYmd, endYmd } = windowBoundsYmd(window)
  const out = new Set<string>()
  for (const [userId, dates] of days) {
    for (const d of dates) {
      if (d >= startYmd && d < endYmd) {
        out.add(userId)
        break
      }
    }
  }
  return out
}
