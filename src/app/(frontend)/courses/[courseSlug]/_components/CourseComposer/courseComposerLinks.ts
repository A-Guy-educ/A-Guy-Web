/**
 * Lesson-link helpers shared by the composer's local results and AI card.
 *
 * @fileType utility
 * @domain frontend
 */
import type { LessonType } from '@/server/constants/lesson-types'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'

export const BADGE_CLASSES: Record<LessonType, string> = {
  learning: 'bg-tab-learn/10 text-tab-learn border-tab-learn/30',
  practice: 'bg-tab-practice/10 text-tab-practice border-tab-practice/30',
  exam: 'bg-tab-exams/10 text-tab-exams border-tab-exams/30',
}

export function buildLessonHref(node: LessonSearchNode, courseSlug: string): string | null {
  if (!node.chapterSlug) return null
  return `/courses/${courseSlug}/chapters/${node.chapterSlug}/lessons/${node.lesson.slug}`
}
