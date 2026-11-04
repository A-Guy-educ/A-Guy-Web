/**
 * User Course Selection Service
 *
 * @fileType service
 * @domain onboarding
 * @pattern service
 * @ai-summary Resolves a signed-in user's course selection from `users.currentCourse` and checks class membership. Both feed shared-device handling: the server, not the browser, decides which course a student sees, and school students never adopt unowned local data.
 */

import { ObjectId } from 'mongodb'

import { getContentDb, relationId } from '@/infra/db/content-db'
import type { CourseSelection } from '@/infra/onboarding/courseSelectionSource'
import { idCandidates } from '@/server/web-api/progress'

/** Same fallback as the GreetingFlow picker when a course has no label. */
const DEFAULT_GRADE_LEVEL = '8'

function firstText(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

/**
 * The course + grade bundle for a stored `currentCourse` reference, or `null`
 * when the reference is empty, malformed, or points at a deleted course.
 *
 * Grade mirrors the client pickers: `courseLabel`, then `title`, then '8'.
 */
export async function getCourseSelection(currentCourse: unknown): Promise<CourseSelection | null> {
  const courseId = relationId(currentCourse)
  if (!courseId || !ObjectId.isValid(courseId)) return null

  const db = await getContentDb()
  const course = await db
    .collection('courses')
    .findOne({ _id: new ObjectId(courseId) }, { projection: { courseLabel: 1, title: 1 } })
  if (!course) return null

  return {
    courseId,
    gradeLevel: firstText(course.courseLabel, course.title) ?? DEFAULT_GRADE_LEVEL,
  }
}

/**
 * True when the user is on any class roster (student or teacher) — the same
 * B2B definition as the dashboard's user segment. Roster ids may be stored as
 * ObjectId or string, hence `idCandidates`.
 */
export async function isClassMember(userId: string): Promise<boolean> {
  const refs = idCandidates(userId)
  const db = await getContentDb()
  const match = await db
    .collection('classes')
    .findOne(
      { $or: [{ students: { $in: refs } }, { teachers: { $in: refs } }] },
      { projection: { _id: 1 } },
    )
  return match !== null
}
