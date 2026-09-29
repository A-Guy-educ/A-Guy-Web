import type { Chapter, Lesson } from '@/infra/types/content'
import {
  getEffectiveLessonType,
  LESSON_TYPES,
  type LessonType,
} from '@/server/constants/lesson-types'
import type { LessonSearchNode } from './lessonRoadmapTypes'

interface BuildLessonSearchNodesInput {
  chapters: Chapter[]
  lessons: Lesson[]
}

function chapterIdOf(lesson: Lesson): string | null {
  const c = lesson.chapter
  if (!c) return null
  return typeof c === 'string' ? c : (c.id ?? null)
}

// Flat search index across every lesson type in the course. `displayIndex` is
// numbered per-type so the "05" shown next to a practice result matches what
// the Practice tab shows for that lesson, not a global counter mixing types.
export function buildLessonSearchNodes({
  chapters,
  lessons,
}: BuildLessonSearchNodesInput): LessonSearchNode[] {
  const orderedChapters = [...chapters].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity),
  )

  const nodes: LessonSearchNode[] = []
  for (const type of LESSON_TYPES) {
    nodes.push(...collectNodesForType(orderedChapters, lessons, type))
  }
  return nodes
}

function collectNodesForType(
  orderedChapters: Chapter[],
  lessons: Lesson[],
  type: LessonType,
): LessonSearchNode[] {
  const nodes: LessonSearchNode[] = []
  const typeLessons = lessons.filter((l) => getEffectiveLessonType(l.type) === type)
  if (typeLessons.length === 0) return nodes

  const byChapter = new Map<string, Lesson[]>()
  for (const lesson of typeLessons) {
    const chId = chapterIdOf(lesson)
    if (!chId) continue
    const bucket = byChapter.get(chId) ?? []
    bucket.push(lesson)
    byChapter.set(chId, bucket)
  }

  let displayIndex = 0
  for (const chapter of orderedChapters) {
    const raw = byChapter.get(chapter.id) ?? []
    const orderedLessons = [...raw].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    for (const lesson of orderedLessons) {
      displayIndex += 1
      nodes.push({
        lesson,
        chapterSlug: chapter.slug ?? '',
        displayIndex,
        lessonType: type,
      })
    }
  }
  return nodes
}
