/**
 * v1 course-scoping helper. When Dash passes `courseId=<id>`, we restrict
 * every KPI's user pool to accounts whose `currentCourse` currently
 * matches — the same field the existing dashboard's "users-per-course"
 * widget reads.
 *
 * Known gap (documented in the PR): currentCourse is a *now* pointer, not
 * a time-series. A user who studied course A last month but switched to
 * course B today shows up as "B" for every historical bucket. Acceptable
 * for a v0.2 rollout; upgrading needs a per-course activity log.
 */

import { ObjectId, type Db } from 'mongodb'

export type CourseUserFilter = { $in: unknown[] } | null

export async function courseUserFilter(db: Db, courseId: string | null): Promise<CourseUserFilter> {
  if (!courseId) return null
  const courseRef = ObjectId.isValid(courseId) ? new ObjectId(courseId) : courseId
  const rows = await db
    .collection('users')
    .find({ currentCourse: courseRef }, { projection: { _id: 1 } })
    .toArray()
  if (rows.length === 0) return { $in: [] }
  const ids = rows.flatMap((row) =>
    ObjectId.isValid(String(row._id)) ? [row._id as ObjectId, String(row._id)] : [String(row._id)],
  )
  return { $in: ids }
}
