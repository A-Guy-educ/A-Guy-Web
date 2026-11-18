/**
 * B2B / other / B2C cohort split for the dashboard `segment` toggle.
 *
 * Rules live in segment-classifier.ts. B2B starts from the `classes` rosters
 * (students or teachers — Admin-owned collection, A-Guy-Admin #696); `other`
 * is school-driven usage off-roster; B2C is everyone else. The sets are
 * rebuilt per request instead of being stored on users, so they can never
 * drift from the class data.
 *
 * Roster ids may be stored as ObjectId or string (/join $push-es ObjectIds,
 * older writes used strings), so ids are normalised with `relationId` and
 * matched with `idCandidates` — the same convention as class-enrollment.ts.
 */

import type { Db, Document } from 'mongodb'

import { relationId } from '@/infra/db/content-db'
import { idCandidates } from '@/server/web-api/progress'

import type { UserSegment } from './metrics-types'
import {
  CONSUMER_EMAIL_RE,
  SCHOOL_ARRIVAL_MATCH,
  classifyUserSegments,
  type SegmentUserDoc,
  type UserSegmentSets,
} from './segment-classifier'

export interface ClassDoc {
  _id: unknown
  school?: unknown
  students?: unknown
  teachers?: unknown
}

export interface ClassRoster {
  classes: ClassDoc[]
  students: Set<string>
  teachers: Set<string>
  /** Distinct union of students and teachers — the roster id set. */
  members: Set<string>
}

/**
 * Cohort a user aggregation is restricted to; null/undefined = everyone.
 * `in` keeps only `refs` (b2b, other); `nin` drops them (b2c = not b2b and
 * not other), so the three cohorts partition whatever `all` matches.
 */
export interface UserCohort {
  segment: Exclude<UserSegment, 'all'>
  mode: 'in' | 'nin'
  /** Every cohort id in both encodings, for fields stored as ObjectId-or-string. */
  refs: unknown[]
  /** Plain string ids, for string-only fields (llm-usage.userId). */
  stringIds: string[]
}

export function rosterIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(relationId).filter((id): id is string => id !== null)
}

export function buildClassRoster(classes: ClassDoc[]): ClassRoster {
  const students = new Set(classes.flatMap((c) => rosterIds(c.students)))
  const teachers = new Set(classes.flatMap((c) => rosterIds(c.teachers)))
  return { classes, students, teachers, members: new Set([...students, ...teachers]) }
}

export async function fetchClassRoster(db: Db): Promise<ClassRoster> {
  const classes = await db
    .collection<ClassDoc>('classes')
    .find({}, { projection: { school: 1, students: 1, teachers: 1 } })
    .toArray()
  return buildClassRoster(classes)
}

/**
 * Only users who could be non-b2c are read: B2B-flagged ones and anyone whose
 * email isn't at a consumer provider. Consumer-mail users are b2c unless the
 * roster or a school arrival says otherwise.
 */
export async function fetchUserSegments(db: Db, roster: ClassRoster): Promise<UserSegmentSets> {
  const [users, arrivals] = await Promise.all([
    db
      .collection<SegmentUserDoc>('users')
      .find(
        { $or: [{ onboardingType: 'b2b' }, { email: { $not: CONSUMER_EMAIL_RE } }] },
        { projection: { email: 1, onboardingType: 1 } },
      )
      .toArray(),
    db
      .collection('guest-sessions')
      .find(SCHOOL_ARRIVAL_MATCH, { projection: { claimedByUser: 1 } })
      .toArray(),
  ])
  const schoolArrivals = new Set(
    arrivals.map((row) => relationId(row.claimedByUser)).filter((id): id is string => !!id),
  )
  return classifyUserSegments({ rosterMembers: roster.members, users, schoolArrivals })
}

/** Both ObjectId and string forms of each id, for $in / $nin. */
export function idRefs(ids: Iterable<string>): unknown[] {
  return [...ids].flatMap(idCandidates)
}

export function buildUserCohort(
  segment: UserSegment,
  sets: UserSegmentSets | null,
): UserCohort | null {
  if (segment === 'all' || !sets) return null
  const ids = segment === 'b2c' ? [...new Set([...sets.b2b, ...sets.other])] : [...sets[segment]]
  return { segment, mode: segment === 'b2c' ? 'nin' : 'in', refs: idRefs(ids), stringIds: ids }
}

/**
 * Predicate for a user-reference field. `excludeIds` (admins) always apply;
 * an `in` cohort adds `$in` on top, a `nin` cohort folds its ids into `$nin`.
 * Pass mixed refs for ObjectId-or-string fields, `stringIds` for string ones.
 */
function cohortPredicate(
  excludeIds: unknown[],
  cohort: UserCohort | null | undefined,
  ids: unknown[] | undefined,
): Document {
  if (!cohort || !ids) return { $nin: excludeIds }
  if (cohort.mode === 'in') return { $nin: excludeIds, $in: ids }
  return { $nin: [...excludeIds, ...ids] }
}

export function userRefPredicate(excludeRefs: unknown[], cohort?: UserCohort | null): Document {
  return cohortPredicate(excludeRefs, cohort, cohort?.refs)
}

/** Same as userRefPredicate for string-only user id fields (llm-usage.userId). */
export function userIdStringPredicate(excludeIds: string[], cohort?: UserCohort | null): Document {
  return cohortPredicate(excludeIds, cohort, cohort?.stringIds)
}

/** Extra `users` $match clause for the cohort; empty for `all`. */
export function usersCohortMatch(cohort: UserCohort | null | undefined): Document {
  if (!cohort) return {}
  return { _id: { [cohort.mode === 'in' ? '$in' : '$nin']: cohort.refs } }
}

/**
 * Extra guest-sessions $match clause: drop sessions claimed by users outside
 * the cohort. Unclaimed (anonymous) sessions can't be classified and stay in
 * every segment, so visitor counts are only truly scoped once claimed.
 */
export function guestCohortMatch(cohort: UserCohort | null | undefined): Document {
  if (!cohort) return {}
  const claimed = cohort.mode === 'in' ? { $in: cohort.refs } : { $nin: cohort.refs }
  return { $or: [{ claimedByUser: { $exists: false } }, { claimedByUser: claimed }] }
}
