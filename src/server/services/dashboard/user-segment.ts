/**
 * B2B / B2C cohort split for the dashboard Users tab.
 *
 * A user is B2B when their id is on any `classes` roster (students or
 * teachers — Admin-owned collection, A-Guy-Admin #696); everyone else is B2C.
 * The set is rebuilt from the rosters on every request instead of being
 * stored on users, so it can never drift from the class data.
 *
 * Roster ids may be stored as ObjectId or string (/join $push-es ObjectIds,
 * older writes used strings), so ids are normalised with `relationId` and
 * matched with `idCandidates` — the same convention as class-enrollment.ts.
 */

import type { Db, Document } from 'mongodb'

import { relationId } from '@/infra/db/content-db'
import { idCandidates } from '@/server/web-api/progress'

import type { UserSegment } from './metrics-types'

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
  /** Distinct union of students and teachers — the B2B id set. */
  members: Set<string>
}

/** Cohort a user aggregation is restricted to; null/undefined = everyone. */
export interface UserCohort {
  segment: Exclude<UserSegment, 'all'>
  /** Every B2B id in both encodings. */
  refs: unknown[]
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

/** Both ObjectId and string forms of each id, for $in / $nin. */
export function idRefs(ids: Iterable<string>): unknown[] {
  return [...ids].flatMap(idCandidates)
}

export function buildUserCohort(segment: UserSegment, roster: ClassRoster): UserCohort | null {
  if (segment === 'all') return null
  return { segment, refs: idRefs(roster.members) }
}

/**
 * Predicate for a user-reference field. `excludeRefs` (admins) always apply;
 * b2b adds `$in` on top, b2c folds the B2B ids into the `$nin`. The two
 * cohorts therefore partition whatever `all` matches.
 */
export function userRefPredicate(
  excludeRefs: unknown[],
  cohort: UserCohort | null | undefined,
): Document {
  if (!cohort) return { $nin: excludeRefs }
  if (cohort.segment === 'b2b') return { $nin: excludeRefs, $in: cohort.refs }
  return { $nin: [...excludeRefs, ...cohort.refs] }
}

/** Extra `users` $match clause for the cohort; empty for `all`. */
export function usersCohortMatch(cohort: UserCohort | null | undefined): Document {
  if (!cohort) return {}
  return { _id: cohort.segment === 'b2b' ? { $in: cohort.refs } : { $nin: cohort.refs } }
}
