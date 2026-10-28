/**
 * Lesson-visit signals (spec v0.4 §2 Active User, Retention, Churn,
 * PDF Scroll Usability) — all read from the per-visit `lesson-visits` log
 * written by /api/stats/heartbeat.
 *
 * Each visit keeps its own start date and dwell, so a revisit of an old
 * lesson never erases the earlier activity day (the bug with
 * `progressRecords.lastAccessedAt`) and a 1s revisit of a lesson with a
 * large cumulative `timeSpentSeconds` no longer counts as Active.
 *
 * Days are bucketed by visit `startedAt` (UTC). Restricted to the
 * eligible-user pool so admin/test-domain accounts never enter a KPI.
 */

import { type Db } from 'mongodb'

import { LESSON_VISITS_COLLECTION } from '@/server/services/lesson-visits'

import { ACTIVE_CONTENT_TYPE } from './config'
import type { PdfVisitDay, SignalSpan, VisitDay } from './signal-types'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DAY_OF_START = { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } }

function spanMatch(span: SignalSpan, eligibleRefs: unknown[]) {
  return { user: { $in: eligibleRefs }, startedAt: { $gte: span.start, $lt: span.end } }
}

export async function fetchVisitDays(
  db: Db,
  span: SignalSpan,
  eligibleRefs: unknown[],
): Promise<VisitDay[]> {
  if (eligibleRefs.length === 0) return []
  return db
    .collection(LESSON_VISITS_COLLECTION)
    .aggregate<VisitDay>([
      { $match: spanMatch(span, eligibleRefs) },
      {
        $group: {
          _id: { user: '$user', day: DAY_OF_START },
          maxPdfDwellSeconds: {
            $max: { $cond: [{ $eq: ['$contentType', ACTIVE_CONTENT_TYPE] }, '$dwellSeconds', 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          userId: { $toString: '$_id.user' },
          date: '$_id.day',
          maxPdfDwellSeconds: 1,
        },
      },
    ])
    .toArray()
}

export async function fetchPdfVisitDays(
  db: Db,
  span: SignalSpan,
  eligibleRefs: unknown[],
): Promise<PdfVisitDay[]> {
  if (eligibleRefs.length === 0) return []
  return db
    .collection(LESSON_VISITS_COLLECTION)
    .aggregate<PdfVisitDay>([
      { $match: { ...spanMatch(span, eligibleRefs), contentType: ACTIVE_CONTENT_TYPE } },
      {
        $group: {
          _id: DAY_OF_START,
          visits: { $sum: 1 },
          scrolled: { $sum: { $cond: ['$scrolled', 1, 0] } },
        },
      },
      { $project: { _id: 0, date: '$_id', visits: 1, scrolled: 1 } },
    ])
    .toArray()
}

/**
 * The log starts mid-day on deploy, so coverage begins at the first UTC
 * midnight *after* the earliest visit — that day is only partially logged.
 */
export async function fetchVisitLogCoverageStart(db: Db): Promise<string | null> {
  const first = await db
    .collection(LESSON_VISITS_COLLECTION)
    .find({}, { projection: { startedAt: 1 } })
    .sort({ startedAt: 1 })
    .limit(1)
    .next()
  const startedAt = first?.startedAt
  if (!(startedAt instanceof Date)) return null
  const midnight = Date.UTC(
    startedAt.getUTCFullYear(),
    startedAt.getUTCMonth(),
    startedAt.getUTCDate(),
  )
  return new Date(midnight + MS_PER_DAY).toISOString().slice(0, 10)
}
