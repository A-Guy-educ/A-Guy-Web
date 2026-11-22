/**
 * The lesson behind the guide's "ממשיכים:" link: the learning lesson the
 * student is part-way through, else the next one after what they finished.
 * A student with no progress gets null — the four starting points are the
 * guide's whole job for them.
 *
 * @fileType utility
 * @domain frontend
 */
import type { LessonProgress } from '../types'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'

export function pickContinueLesson(
  nodes: LessonSearchNode[],
  progressMap: Record<string, LessonProgress>,
): LessonSearchNode | null {
  const learning = nodes.filter((n) => n.lessonType === 'learning' && n.chapterSlug)
  const percentOf = (n: LessonSearchNode) => progressMap[n.lesson.id]?.percent ?? 0

  const inProgress = learning.find((n) => percentOf(n) > 0 && percentOf(n) < 100)
  if (inProgress) return inProgress

  const doneIndexes = learning.flatMap((n, i) => (percentOf(n) >= 100 ? [i] : []))
  if (doneIndexes.length === 0) return null
  const lastDone = doneIndexes[doneIndexes.length - 1]
  return learning.slice(lastDone + 1).find((n) => percentOf(n) < 100) ?? null
}
