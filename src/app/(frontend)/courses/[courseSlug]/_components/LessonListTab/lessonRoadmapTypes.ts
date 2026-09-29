/**
 * @fileType types
 * @domain frontend
 * @pattern lesson-roadmap
 * @ai-summary Local type surface for the chapter-accordion roadmap: per-lesson status (completed/active/available/locked/soon), the flattened node shape carried through the render tree, the per-chapter grouping, and the filter modes exposed via CourseLessonsFilterBar.
 */

import type { Chapter, Lesson } from '@/infra/types/content'
import type { LessonType } from '@/server/constants/lesson-types'

export type LessonRoadmapStatus = 'completed' | 'active' | 'available' | 'locked' | 'soon'

export interface LessonRoadmapNode {
  lesson: Lesson
  chapterSlug: string
  displayIndex: number
  progressPercent: number
  status: LessonRoadmapStatus
  isFeatured: boolean
}

// Search-only projection: covers all lesson types simultaneously (Learn /
// Practice / Exam), numbered independently per type so `displayIndex` matches
// what the user sees in each tab.
export interface LessonSearchNode {
  lesson: Lesson
  chapterSlug: string
  displayIndex: number
  lessonType: LessonType
}

export interface ChapterRoadmapGroup {
  chapter: Chapter
  chapterIndex: number
  lessons: LessonRoadmapNode[]
  completedCount: number
  totalCount: number
  hasFeatured: boolean
}

export type FilterMode = 'all' | 'focus' | 'uncompleted'
