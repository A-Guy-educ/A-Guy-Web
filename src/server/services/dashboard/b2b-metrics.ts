/**
 * School / class roll-up for the dashboard Users tab when `segment=b2b`.
 *
 * Built from the same class roster as the B2B cohort (user-segment.ts), so
 * the two never disagree. Admins are dropped from every count, matching the
 * rest of the dashboard. "Active" mirrors `userMetrics.returningUsers`:
 * a user-stats row whose `lastActiveDate` is on/after periodStart.
 *
 * Rosters store bare user ids with no join time, so there is no
 * "joined in period" figure — add one only once Admin records it.
 */

import type { Db, Document } from 'mongodb'

import { relationId } from '@/infra/db/content-db'

import type { AdminUserRefs } from './admin-users'
import type { DateBuckets } from './date-buckets'
import type { B2bMetrics, B2bSchoolMetrics } from './metrics-types'
import { idRefs, rosterIds, type ClassRoster } from './user-segment'

const PER_SCHOOL_LIMIT = 20

function countIn(ids: Set<string>, pool: Set<string>): number {
  let n = 0
  for (const id of ids) if (pool.has(id)) n++
  return n
}

/** Pure assembly — exported for unit tests. */
export function buildB2bMetrics(input: {
  roster: ClassRoster
  schoolNames: Map<string, string>
  activeUserIds: Set<string>
  adminUserIds: Set<string>
}): B2bMetrics {
  const { roster, schoolNames, activeUserIds, adminUserIds } = input
  const keep = (id: string) => !adminUserIds.has(id)
  const students = new Set([...roster.students].filter(keep))
  const teachers = new Set([...roster.teachers].filter(keep))

  const bySchool = new Map<string, { classes: number; students: Set<string> }>()
  for (const cls of roster.classes) {
    const schoolId = relationId(cls.school)
    if (!schoolId) continue
    const entry = bySchool.get(schoolId) ?? { classes: 0, students: new Set<string>() }
    const classStudents = rosterIds(cls.students).filter(keep)
    bySchool.set(schoolId, {
      classes: entry.classes + 1,
      students: new Set([...entry.students, ...classStudents]),
    })
  }

  const perSchool: B2bSchoolMetrics[] = [...bySchool.entries()]
    .map(([schoolId, entry]) => ({
      schoolId,
      schoolName: schoolNames.get(schoolId) ?? '',
      classes: entry.classes,
      students: entry.students.size,
      activeStudentsInPeriod: countIn(entry.students, activeUserIds),
    }))
    .sort((a, b) => b.students - a.students || a.schoolName.localeCompare(b.schoolName, 'he'))
    .slice(0, PER_SCHOOL_LIMIT)

  return {
    schools: bySchool.size,
    classes: roster.classes.length,
    students: students.size,
    teachers: teachers.size,
    activeStudentsInPeriod: countIn(students, activeUserIds),
    perSchool,
  }
}

export async function aggregateB2bMetrics(
  db: Db,
  roster: ClassRoster,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
): Promise<B2bMetrics> {
  const schoolIds = [
    ...new Set(roster.classes.map((c) => relationId(c.school)).filter(Boolean)),
  ] as string[]

  const [schools, activeRows] = await Promise.all([
    db
      .collection('schools')
      .find({ _id: { $in: idRefs(schoolIds) } } as Document, { projection: { name: 1 } })
      .toArray(),
    db
      .collection('user-stats')
      .find(
        {
          user: { $in: idRefs(roster.students) },
          lastActiveDate: { $gte: buckets.periodStartStr },
        },
        { projection: { user: 1 } },
      )
      .toArray(),
  ])

  return buildB2bMetrics({
    roster,
    schoolNames: new Map(
      schools.map((s) => [String(s._id), typeof s.name === 'string' ? s.name : '']),
    ),
    activeUserIds: new Set(
      activeRows.map((r) => relationId(r.user)).filter((id): id is string => id !== null),
    ),
    adminUserIds: new Set(adminUserRefs.stringIds),
  })
}
