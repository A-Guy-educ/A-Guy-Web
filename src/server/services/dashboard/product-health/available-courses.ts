/**
 * Feeds the "All Courses ▾" filter dropdown (spec §5). Reads the same
 * `courses` collection the rest of the dashboard uses. Cheap enough to
 * ship as a full list — there are not enough courses to paginate today.
 */

import { type Db } from 'mongodb'

import type { AvailableCourse } from './types'

interface Row {
  _id: unknown
  title?: string
  courseLabel?: string
  slug?: string
}

export async function fetchAvailableCourses(db: Db): Promise<AvailableCourse[]> {
  const rows = (await db
    .collection('courses')
    .find({}, { projection: { title: 1, courseLabel: 1, slug: 1 } })
    .toArray()) as Row[]
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title || row.courseLabel || row.slug || `Course ${String(row._id).slice(-6)}`,
  }))
}
