/**
 * Guest sessions that turned out to be an existing student logging back in,
 * not a new visitor. The funnel drops them from every visitor step.
 *
 * Two sources:
 * - Recorded: the Google callback stamps `onboarding.googleOutcome:
 *   'existing_login'` on the session (from the first stamped outcome on).
 * - Estimated, for sessions from before outcomes were recorded: a Google
 *   click on an unclaimed session followed within EXISTING_LOGIN_WINDOW_MS
 *   by a login to an account older than EXISTING_ACCOUNT_MIN_AGE_MS. Checked
 *   on prod 2026-11-24: 294 of 544 lost clicks matched, against 35 by chance
 *   with the clicks shifted an hour.
 *
 * A session that was also claimed by a new account is never dropped.
 */

import type { Db, Document, ObjectId } from 'mongodb'

import { TRACKED_SESSION } from './guest-insights-pipelines'

export const EXISTING_LOGIN_WINDOW_MS = 2 * 60 * 1000
/** A session created this soon after the account is the signup itself, not a login. */
export const EXISTING_ACCOUNT_MIN_AGE_MS = 5 * 60 * 1000

const UNCLAIMED = { claimedByUser: { $exists: false } }

export interface GoogleClick {
  id: ObjectId
  clickedAt: Date
}

/** Clicks followed within `windowMs` by a login; `loginTimes` must be sorted ascending. */
export function matchClicksToLogins(
  clicks: readonly GoogleClick[],
  loginTimes: readonly number[],
  windowMs: number = EXISTING_LOGIN_WINDOW_MS,
): ObjectId[] {
  return clicks
    .filter(({ clickedAt }) => {
      const t = clickedAt.getTime()
      // First login at or after the click (binary search).
      let lo = 0
      let hi = loginTimes.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (loginTimes[mid] < t) lo = mid + 1
        else hi = mid
      }
      return lo < loginTimes.length && loginTimes[lo] - t <= windowMs
    })
    .map(({ id }) => id)
}

interface UserSessionsDoc {
  createdAt?: Date
  sessions?: Array<{ createdAt?: Date }>
}

/** Login times (session starts) of accounts that already existed, sorted. */
export function existingAccountLoginTimes(
  users: readonly UserSessionsDoc[],
  since: Date,
): number[] {
  return users
    .flatMap(({ createdAt, sessions }) =>
      (sessions ?? [])
        .map((session) => session.createdAt?.getTime())
        .filter(
          (at): at is number =>
            at !== undefined &&
            at >= since.getTime() &&
            (!createdAt || at - createdAt.getTime() > EXISTING_ACCOUNT_MIN_AGE_MS),
        ),
    )
    .sort((a, b) => a - b)
}

/** When the callback started stamping outcomes; `now` when it hasn't yet. */
async function outcomesRecordedSince(db: Db, now: Date): Promise<Date> {
  const [first] = await db
    .collection('guest-sessions')
    .find(
      { 'onboarding.googleOutcomeAt': { $exists: true } },
      { projection: { 'onboarding.googleOutcomeAt': 1 } },
    )
    .sort({ 'onboarding.googleOutcomeAt': 1 })
    .limit(1)
    .toArray()
  return (first?.onboarding?.googleOutcomeAt as Date | undefined) ?? now
}

export interface ExistingStudentEstimate {
  /** Unstamped sessions in the period estimated to be existing-student logins. */
  ids: ObjectId[]
  /** First recorded Google outcome; null when none has been recorded yet. */
  outcomesSince: Date | null
}

export async function estimateExistingStudentSessions(
  db: Db,
  since: Date,
  now: Date,
): Promise<ExistingStudentEstimate> {
  const cutover = await outcomesRecordedSince(db, now)
  const outcomesSince = cutover < now ? cutover : null
  if (cutover <= since) return { ids: [], outcomesSince }
  const clicks = await db
    .collection('guest-sessions')
    .find(
      {
        createdAt: { $gte: since },
        ...TRACKED_SESSION,
        ...UNCLAIMED,
        'onboarding.googleOutcome': { $exists: false },
        'onboarding.googleClickedAt': { $lt: cutover },
      },
      { projection: { 'onboarding.googleClickedAt': 1 } },
    )
    .toArray()
  if (clicks.length === 0) return { ids: [], outcomesSince }
  const users = await db
    .collection<UserSessionsDoc>('users')
    .find({ 'sessions.createdAt': { $gte: since } }, { projection: { createdAt: 1, sessions: 1 } })
    .toArray()
  const ids = matchClicksToLogins(
    clicks.map((row) => ({ id: row._id, clickedAt: row.onboarding.googleClickedAt as Date })),
    existingAccountLoginTimes(users, since),
  )
  return { ids, outcomesSince }
}

/** guest-sessions $match clause dropping recorded and estimated existing students. */
export function excludeExistingStudents(estimatedIds: readonly ObjectId[]): Document {
  return {
    $nor: [{ 'onboarding.googleOutcome': 'existing_login', ...UNCLAIMED }],
    ...(estimatedIds.length > 0 ? { _id: { $nin: [...estimatedIds] } } : {}),
  }
}

/** Recorded existing-student sessions in the period (estimated ones are counted by the caller). */
export function countRecordedExistingStudents(db: Db, since: Date): Promise<number> {
  return db.collection('guest-sessions').countDocuments({
    createdAt: { $gte: since },
    ...TRACKED_SESSION,
    ...UNCLAIMED,
    'onboarding.googleOutcome': 'existing_login',
  })
}
