/**
 * Student self-enrollment for the /join page: lists schools with their
 * classes, and adds a signed-in student to a class's `students` roster.
 *
 * Schools / classes are Admin-owned collections (A-Guy-Admin #696). Relations
 * are matched with `idCandidates` so both ObjectId and string storage work,
 * like every other relationship query in Web.
 *
 * @fileType service
 * @domain classroom
 * @pattern service
 * @ai-summary Lists joinable schools/classes and enrolls a student into a class, returning the class course slug
 */

import type { Document } from 'mongodb'

import { getContentDb, objectIdFromString, relationId } from '@/infra/db/content-db'
import { queryCourseSlugById } from '@/server/repos/queries/courses'
import { idCandidates } from '@/server/web-api/progress'

const SCHOOLS_COLLECTION = 'schools'
const CLASSES_COLLECTION = 'classes'

const HEX24 = /^[a-f0-9]{24}$/i

export interface JoinableClass {
  id: string
  name: string
}

export interface JoinableSchool {
  id: string
  name: string
  classes: JoinableClass[]
}

const docName = (doc: Document) => (typeof doc.name === 'string' ? doc.name : '')
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'he')

/** Schools that have at least one class with a course, each with its classes. */
export async function listJoinableSchools(): Promise<JoinableSchool[]> {
  const db = await getContentDb()
  const [schools, classes] = await Promise.all([
    db
      .collection(SCHOOLS_COLLECTION)
      .find({}, { projection: { name: 1 } })
      .toArray(),
    db
      .collection(CLASSES_COLLECTION)
      .find({ course: { $exists: true, $ne: null } }, { projection: { name: 1, school: 1 } })
      .toArray(),
  ])

  return schools
    .map((school) => {
      const schoolId = String(school._id)
      return {
        id: schoolId,
        name: docName(school),
        classes: classes
          .filter((c) => relationId(c.school) === schoolId)
          .map((c) => ({ id: String(c._id), name: docName(c) }))
          .sort(byName),
      }
    })
    .filter((school) => school.classes.length > 0)
    .sort(byName)
}

export type EnrollResult = { status: 'enrolled'; courseSlug: string } | { status: 'not_found' }

/**
 * Adds the user to the class roster (idempotent) and returns the class's
 * course slug. `not_found` covers a bad id, a missing class, and a class whose
 * course is gone — the student has nowhere to land in any of those.
 */
export async function enrollStudentInClass(userId: string, classId: string): Promise<EnrollResult> {
  if (!HEX24.test(classId)) return { status: 'not_found' }

  const db = await getContentDb()
  const classFilter = { _id: objectIdFromString(classId) } as Document
  const classDoc = await db
    .collection(CLASSES_COLLECTION)
    .findOne(classFilter, { projection: { course: 1 } })
  const courseId = classDoc ? relationId(classDoc.course) : null
  const courseSlug = courseId ? await queryCourseSlugById(courseId) : null
  if (!courseSlug) return { status: 'not_found' }

  // $push guarded by $nin rather than $addToSet: the roster may hold the id as
  // a string or an ObjectId, and $addToSet only dedupes exact matches.
  await db
    .collection(CLASSES_COLLECTION)
    .updateOne({ ...classFilter, students: { $nin: idCandidates(userId) } }, {
      $push: { students: objectIdFromString(userId) },
    } as Document)

  return { status: 'enrolled', courseSlug }
}
