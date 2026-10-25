/**
 * Teacher dashboard reads: the classes a teacher can see and one class's
 * per-student, per-lesson, per-question progress.
 *
 * Classes / schools are Admin-owned collections (A-Guy-Admin #696). Relations
 * are matched with `idCandidates` so both ObjectId and string storage work,
 * like every other relationship query in Web.
 *
 * @fileType service
 * @domain teacher-dashboard
 * @pattern service
 * @ai-summary Lists a teacher's classes and assembles class progress from lessons, user-progresses and question-attempts
 */

import type { Document } from 'mongodb'

import { AccountRole } from '@/infra/auth/roles'
import { getContentDb, objectIdFromString, relationId } from '@/infra/db/content-db'
import type { Exercise } from '@/infra/types/content'
import { getExerciseBlocks } from '@/lib/exercises/getExerciseBlocks'
import { aggregateManySerialized } from '@/server/repos/mongo'
import { sectionsLookupStage } from '@/server/repos/queries/exercises-with-sections'
import { queryLessonsByCourse } from '@/server/repos/queries/lessons'
import { QUESTION_ATTEMPTS_COLLECTION } from '@/server/services/question-attempts/question-attempt-recorder'
import { idCandidates, USER_PROGRESS_COLLECTION } from '@/server/web-api/progress'

import {
  buildClassProgress,
  type AttemptInput,
  type ClassProgressResponse,
  type LessonQuestions,
  type ProgressDocInput,
} from './class-progress-shape'
import { canViewClass, relationIds, type TeacherViewer } from './teacher-class-access'

const CLASSES_COLLECTION = 'classes'

/** Question block types a student can submit an answer to. */
const QUESTION_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
])

const HEX24 = /^[a-f0-9]{24}$/i

function idsFilter(ids: string[]): Document {
  return { $in: ids.flatMap(idCandidates) }
}

export async function listTeacherClasses(
  viewer: TeacherViewer,
): Promise<Array<{ id: string; name: string; studentCount: number }>> {
  const filter: Document =
    viewer.role === AccountRole.Admin
      ? {}
      : {
          teachers: { $in: idCandidates(viewer.id) },
          ...(viewer.tenantId ? { tenant: { $in: idCandidates(viewer.tenantId) } } : {}),
        }

  const db = await getContentDb()
  const docs = await db
    .collection(CLASSES_COLLECTION)
    .find(filter, { projection: { name: 1, students: 1 } })
    .sort({ name: 1 })
    .toArray()

  return docs.map((doc) => ({
    id: String(doc._id),
    name: typeof doc.name === 'string' ? doc.name : '',
    studentCount: relationIds(doc.students).length,
  }))
}

async function loadLessonQuestions(courseId: string): Promise<LessonQuestions[]> {
  const lessons = await queryLessonsByCourse({ courseId })
  if (lessons.length === 0) return []

  const exercises = await aggregateManySerialized<Exercise>('exercises', [
    { $match: { lesson: idsFilter(lessons.map((l) => l.id)) } },
    sectionsLookupStage(),
  ])
  const byOrder = (a: Exercise, b: Exercise) =>
    (typeof a.order === 'number' ? a.order : Infinity) -
    (typeof b.order === 'number' ? b.order : Infinity)

  return lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title ?? '',
    questions: exercises
      .filter((exercise) => relationId(exercise.lesson) === lesson.id)
      .sort(byOrder)
      .flatMap((exercise) =>
        getExerciseBlocks(exercise)
          .filter((block) => QUESTION_BLOCK_TYPES.has(block.type) && Boolean(block.id))
          .map((block) => ({ exerciseId: exercise.id, blockId: String(block.id) })),
      ),
  }))
}

async function loadStudents(studentIds: string[]): Promise<Array<{ id: string; name: string }>> {
  if (studentIds.length === 0) return []
  const db = await getContentDb()
  // Name only — the teacher contract excludes email / phone.
  const docs = await db
    .collection('users')
    .find({ _id: idsFilter(studentIds) }, { projection: { name: 1 } })
    .toArray()
  const names = new Map(docs.map((d) => [String(d._id), typeof d.name === 'string' ? d.name : '']))
  // Keep class roster order; drop ids whose user doc no longer exists.
  return studentIds.filter((id) => names.has(id)).map((id) => ({ id, name: names.get(id) ?? '' }))
}

async function loadProgressDocs(studentIds: string[]): Promise<ProgressDocInput[]> {
  if (studentIds.length === 0) return []
  const db = await getContentDb()
  const docs = await db
    .collection(USER_PROGRESS_COLLECTION)
    .find(
      { user: idsFilter(studentIds) },
      { projection: { user: 1, gradeLevel: 1, progressRecords: 1 } },
    )
    .toArray()
  return docs.map((doc) => ({
    user: relationId(doc.user) ?? '',
    gradeLevel: typeof doc.gradeLevel === 'string' ? doc.gradeLevel : undefined,
    progressRecords: Array.isArray(doc.progressRecords) ? doc.progressRecords : [],
  }))
}

async function loadAttempts(studentIds: string[], lessonIds: string[]): Promise<AttemptInput[]> {
  if (studentIds.length === 0 || lessonIds.length === 0) return []
  const db = await getContentDb()
  const docs = await db
    .collection(QUESTION_ATTEMPTS_COLLECTION)
    .find(
      { user: idsFilter(studentIds), lesson: idsFilter(lessonIds) },
      {
        projection: {
          user: 1,
          lesson: 1,
          exercise: 1,
          block: 1,
          solved: 1,
          wrongCount: 1,
          hintCount: 1,
          explanationCount: 1,
        },
      },
    )
    .toArray()
  return docs.map((doc) => ({
    user: relationId(doc.user) ?? '',
    lesson: relationId(doc.lesson) ?? '',
    exercise: relationId(doc.exercise) ?? '',
    block: String(doc.block ?? ''),
    solved: doc.solved === true,
    wrongCount: Number(doc.wrongCount) || 0,
    hintCount: Number(doc.hintCount) || 0,
    explanationCount: Number(doc.explanationCount) || 0,
  }))
}

/**
 * Returns `null` when the class doesn't exist OR the viewer may not read it —
 * the route answers 404 for both so class ids can't be probed.
 */
export async function getClassProgressForViewer(
  viewer: TeacherViewer,
  classId: string,
): Promise<ClassProgressResponse | null> {
  if (!HEX24.test(classId)) return null
  const db = await getContentDb()
  const classDoc = await db
    .collection(CLASSES_COLLECTION)
    .findOne({ _id: objectIdFromString(classId) } as Document)
  if (!classDoc || !canViewClass(viewer, classDoc)) return null

  const courseId = relationId(classDoc.course)
  const studentIds = relationIds(classDoc.students)
  const lessons = courseId ? await loadLessonQuestions(courseId) : []

  const [students, progressDocs, attempts] = await Promise.all([
    loadStudents(studentIds),
    loadProgressDocs(studentIds),
    loadAttempts(
      studentIds,
      lessons.map((l) => l.id),
    ),
  ])

  return buildClassProgress({
    classId,
    className: typeof classDoc.name === 'string' ? classDoc.name : '',
    lessons,
    students,
    progressDocs,
    attempts,
  })
}
