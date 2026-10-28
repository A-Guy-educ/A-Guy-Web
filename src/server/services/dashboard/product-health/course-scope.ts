/**
 * Turns the `courseId` / `grade` filters into a `users.currentCourse`
 * match (or null for "All").
 *
 * `grade` is the course label users pick at onboarding (`courses.courseLabel`,
 * e.g. `10`, `5 יח"ל`) — several courses can share one label across
 * tenants/locales, so it expands to every course carrying it. With both
 * filters set, the course must also carry the grade (empty result otherwise).
 *
 * Both are attribution *snapshots*: `currentCourse` is overwritten on every
 * lesson open, so a user who moved grades counts under the current one for
 * historical buckets. `course_selections` can't serve as history — its
 * `user` field is never populated (guest picks before sign-up).
 */

import { ObjectId, type Db } from 'mongodb'

function bothForms(id: unknown): unknown[] {
  const str = String(id)
  return ObjectId.isValid(str) && str.length === 24 ? [new ObjectId(str), str] : [str]
}

export async function resolveCurrentCourseMatch(
  db: Db,
  courseId: string | null,
  grade: string | null,
): Promise<unknown | null> {
  if (!grade) return courseId ? { $in: bothForms(courseId) } : null
  const rows = await db
    .collection('courses')
    .find({ courseLabel: grade }, { projection: { _id: 1 } })
    .toArray()
  const ids = rows.map((row) => String(row._id)).filter((id) => !courseId || id === courseId)
  return { $in: ids.flatMap(bothForms) }
}
