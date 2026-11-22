// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { pickContinueLesson } from '@/app/(frontend)/courses/[courseSlug]/_components/CourseHub/pickContinueLesson'
import type { LessonSearchNode } from '@/app/(frontend)/courses/[courseSlug]/_components/LessonListTab/lessonRoadmapTypes'
import type { Lesson } from '@/infra/types/content'

function node(id: string, lessonType: LessonSearchNode['lessonType'] = 'learning') {
  return {
    lesson: { id, title: id, slug: id } as unknown as Lesson,
    chapterSlug: 'ch',
    displayIndex: 1,
    lessonType,
  }
}

const nodes = [node('l1'), node('l2'), node('p1', 'practice'), node('l3'), node('l4')]
const progress = (entries: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(entries).map(([id, percent]) => [id, { completed: 0, total: 1, percent }]),
  )

describe('pickContinueLesson', () => {
  it('returns null for a student with no progress', () => {
    expect(pickContinueLesson(nodes, {})).toBeNull()
  })

  it('prefers the learning lesson that is part-way done', () => {
    expect(pickContinueLesson(nodes, progress({ l1: 100, l3: 40 }))?.lesson.id).toBe('l3')
  })

  it('otherwise picks the next unfinished lesson after the last finished one', () => {
    expect(pickContinueLesson(nodes, progress({ l1: 100, l2: 100 }))?.lesson.id).toBe('l3')
  })

  it('ignores practice progress and returns null when everything is done', () => {
    expect(pickContinueLesson(nodes, progress({ p1: 50 }))).toBeNull()
    expect(pickContinueLesson(nodes, progress({ l1: 100, l2: 100, l3: 100, l4: 100 }))).toBeNull()
  })
})
