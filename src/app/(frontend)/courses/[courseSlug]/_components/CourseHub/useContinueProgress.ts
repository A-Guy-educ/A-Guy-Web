/**
 * The progress "continue" picks from: the server-rendered map, with each
 * lesson's last-opened time re-read on mount. Pressing back from a lesson can
 * restore the course page from the router cache, whose map predates the
 * lesson just opened; the fresh read makes that lesson count straight away.
 *
 * @fileType hook
 * @domain frontend
 */
'use client'

import { useMemo } from 'react'

import { useProgressMap } from '@/client/hooks/useProgressMap'
import type { Lesson } from '@/infra/types/content'
import type { LessonProgress } from '../types'

export function useContinueProgress(
  lessons: Lesson[],
  /** The course's progress bucket — `course.courseLabel`, as the page reads it. */
  courseLabel: string,
  serverMap: Record<string, LessonProgress>,
): Record<string, LessonProgress> {
  const lessonIds = useMemo(() => lessons.map((lesson) => lesson.id), [lessons])
  const { lastAccessedMap } = useProgressMap({
    recordType: 'lesson',
    recordIds: lessonIds,
    // The server reads the 'default' bucket for a course without a label.
    gradeLevel: courseLabel || 'default',
  })

  return useMemo(() => {
    const fresh = Object.entries(lastAccessedMap)
    if (fresh.length === 0) return serverMap
    const merged = { ...serverMap }
    for (const [lessonId, openedAt] of fresh) {
      const known = merged[lessonId] ?? { completed: 0, total: 0, percent: 0 }
      if (!known.lastOpenedAt || openedAt > known.lastOpenedAt) {
        merged[lessonId] = { ...known, lastOpenedAt: openedAt }
      }
    }
    return merged
  }, [lastAccessedMap, serverMap])
}
