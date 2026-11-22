import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LessonSearchNode } from '@/app/(frontend)/courses/[courseSlug]/_components/LessonListTab/lessonRoadmapTypes'
import {
  buildSuggestLessons,
  fetchLessonSuggestion,
  looksLikeSentence,
} from '@/app/(frontend)/courses/[courseSlug]/_components/CourseComposer/courseComposerSuggest'
import type { Lesson } from '@/infra/types/content'

function node(id: string, title: string | null, chapterSlug = 'ch'): LessonSearchNode {
  return {
    lesson: { id, title, slug: id } as unknown as Lesson,
    chapterSlug,
    chapterTitle: 'פונקציות',
    displayIndex: 1,
    lessonType: 'learning',
  }
}

describe('looksLikeSentence', () => {
  it('treats a bare topic as a search, not a sentence', () => {
    expect(looksLikeSentence('אסימפטוטה')).toBe(false)
    expect(looksLikeSentence('נקודה ייצוגית')).toBe(false)
  })

  it('treats questions and 3+ word requests as sentences', () => {
    expect(looksLikeSentence('תוכל ללמד אותי אסימפטוטה?')).toBe(true)
    expect(looksLikeSentence('אסימפטוטה?')).toBe(true)
    expect(looksLikeSentence('teach me asymptotes')).toBe(true)
  })
})

describe('buildSuggestLessons', () => {
  it('skips lessons with no title or no chapter link', () => {
    const lessons = buildSuggestLessons([node('a', 'A'), node('b', null), node('c', 'C', '')])
    expect(lessons).toEqual([{ id: 'a', title: 'A', chapter: 'פונקציות', type: 'learning' }])
  })
})

describe('fetchLessonSuggestion', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('turns returned lesson ids back into linkable nodes, ignoring unknown ids', async () => {
    const nodes = [node('a', 'A'), node('b', 'B')]
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ intent: 'lessons', message: 'הנה', lessonIds: ['b', 'zz'] }),
          ),
        ),
    )

    const result = await fetchLessonSuggestion({
      query: 'תלמד אותי B',
      locale: 'he',
      courseTitle: 'קורס',
      nodes,
      signal: new AbortController().signal,
    })

    expect(result.intent).toBe('lessons')
    expect(result.lessons.map((n) => n.lesson.id)).toEqual(['b'])
  })
})
