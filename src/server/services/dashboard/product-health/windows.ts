/**
 * Time-window helpers for the Product Health tab.
 *
 * All windows are half-open [start, end) at UTC-midnight boundaries. The
 * caller ships date-only strings; internally we work in `Date` so the
 * `createdAt` (BSON Date) and `lastAccessedAt` (ISO string) comparisons
 * stay in one timezone.
 */

import type { ParsedProductHealthParams } from './params'
import type { Granularity } from './types'

export interface Window {
  start: Date
  end: Date
}

export interface ResolvedPeriod {
  period: Window
  comparison: Window
  buckets: Window[]
  retentionLookbackDays: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const RETENTION_LOOKBACK_DAYS = 30

function utcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`)
}

function todayUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function periodLengthDays({ start, end }: Window): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

export function resolvePeriod(
  params: ParsedProductHealthParams,
  now: Date = new Date(),
): ResolvedPeriod {
  const period = buildPeriod(params, now)
  const length = periodLengthDays(period)
  const comparison: Window = { start: addDays(period.start, -length), end: period.start }
  return {
    period,
    comparison,
    buckets: buildBuckets(period, params.granularity),
    retentionLookbackDays: RETENTION_LOOKBACK_DAYS,
  }
}

function buildPeriod(params: ParsedProductHealthParams, now: Date): Window {
  if (params.range === 'custom' && params.start && params.end) {
    // end is inclusive in the URL contract → make it exclusive here so a
    // one-day custom range like start=end=today still yields a 1-day window.
    return { start: utcMidnight(params.start), end: addDays(utcMidnight(params.end), 1) }
  }
  const days = params.range === '7d' ? 7 : params.range === '90d' ? 90 : 30
  const end = addDays(todayUtc(now), 1)
  return { start: addDays(end, -days), end }
}

function buildBuckets(period: Window, granularity: Granularity): Window[] {
  if (granularity === 'daily') return bucketsByStep(period, 1)
  if (granularity === 'weekly') return bucketsByStep(period, 7)
  return bucketsByMonth(period)
}

function bucketsByStep(period: Window, stepDays: number): Window[] {
  const out: Window[] = []
  let cursor = period.start
  while (cursor < period.end) {
    const next = addDays(cursor, stepDays)
    out.push({ start: cursor, end: next < period.end ? next : period.end })
    cursor = next
  }
  return out
}

function bucketsByMonth(period: Window): Window[] {
  const out: Window[] = []
  let cursor = period.start
  while (cursor < period.end) {
    const next = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate()),
    )
    out.push({ start: cursor, end: next < period.end ? next : period.end })
    cursor = next
  }
  return out
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * The earliest boundary we need Mongo data for. Trend + comparison already
 * cover most of it; the extra 30d lookback funds the retention denominator
 * on the first trend bucket.
 */
export function signalWindowStart(resolved: ResolvedPeriod): Date {
  const earliestBucketStart = resolved.buckets[0]?.start ?? resolved.period.start
  const earliest =
    earliestBucketStart < resolved.comparison.start
      ? earliestBucketStart
      : resolved.comparison.start
  return addDays(earliest, -resolved.retentionLookbackDays)
}
