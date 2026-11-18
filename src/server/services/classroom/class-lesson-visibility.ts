/**
 * Lessons a student's teachers have hidden. Teachers toggle them in A-Guy-Teacher;
 * the ids live on `classes.hiddenLessons` (Admin-owned collection, written only by
 * Web — see setClassLessonHidden). An empty or missing list hides nothing, so
 * students outside a class never pay more than one indexed lookup.
 *
 * @fileType service
 * @domain classroom
 * @pattern service
 * @ai-summary Resolves which lessons of a course are hidden from a student by their class teachers
 */

import type { Document } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import {
  canUseTeacherDashboard,
  relationIds,
} from '@/server/services/teacher-dashboard/teacher-class-access'
import { idCandidates } from '@/server/web-api/progress'

const CLASSES_COLLECTION = 'classes'

const NONE: ReadonlySet<string> = new Set()

/**
 * A student can sit in several classes on the same course; a lesson stays hidden
 * only when every one of them hides it, so one teacher can't take a lesson away
 * that another teacher opened.
 */
export function hiddenInEveryClass(
  classes: ReadonlyArray<Record<string, unknown> & { hiddenLessons?: unknown }>,
): ReadonlySet<string> {
  const [first, ...rest] = classes.map((doc) => new Set(relationIds(doc.hiddenLessons)))
  if (!first) return NONE
  return new Set([...first].filter((id) => rest.every((ids) => ids.has(id))))
}

export async function getHiddenLessonIdsForStudent(
  user: { id: string | number; role?: unknown } | null | undefined,
  courseId: string | null | undefined,
): Promise<ReadonlySet<string>> {
  if (!user?.id || !courseId) return NONE
  // Teachers and admins see the whole course; hiding only applies to students.
  if (canUseTeacherDashboard(user.role)) return NONE

  const db = await getContentDb()
  const classes = await db
    .collection(CLASSES_COLLECTION)
    .find(
      {
        students: { $in: idCandidates(String(user.id)) },
        course: { $in: idCandidates(courseId) },
      } as Document,
      { projection: { hiddenLessons: 1 } },
    )
    .toArray()
  return hiddenInEveryClass(classes)
}

export function withoutHiddenLessons<T extends { id: string }>(
  lessons: T[],
  hidden: ReadonlySet<string>,
): T[] {
  return hidden.size === 0 ? lessons : lessons.filter((lesson) => !hidden.has(lesson.id))
}
