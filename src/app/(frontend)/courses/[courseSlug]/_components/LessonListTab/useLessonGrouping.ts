/**
 * @fileType hook
 * @domain frontend
 * @pattern lesson-roadmap-grouping
 * @ai-summary Pure grouping helper for the lessons roadmap: orders chapters + lessons, resolves each lesson's status (soon / locked / completed / active / available) via ContentStatusBadge-compatible logic, and marks the first non-completed non-locked lesson across the whole roadmap as the featured "next up". No React state or side effects.
 */

import { useMemo } from 'react'
import type { Chapter, Lesson } from '@/infra/types/content'
import { resolveAccessType } from '@/infra/auth/access-types'
import { canAccessExam, canAccessPracticeLesson, type TierSlug } from '@/lib/tiers'
import { getEffectiveLessonType } from '@/server/constants/lesson-types'
import type {
  ChapterRoadmapGroup,
  LessonRoadmapNode,
  LessonRoadmapStatus,
} from './lessonRoadmapTypes'

interface GroupingInput {
  chapters: Chapter[]
  lessons: Lesson[]
  progressByLessonId: Record<string, number>
  courseAccessType: string | null | undefined
  hasPaidAccess: boolean
  /**
   * Current user's tier slug. When omitted, no tier gating is applied — only
   * the legacy access-type path. Also unused in practice when the global
   * `TIER_ENFORCEMENT_ENABLED` switch is off (the gate helpers short-circuit).
   */
  tierSlug?: TierSlug | null
}

function chapterIdOf(lesson: Lesson): string | null {
  const c = lesson.chapter
  if (!c) return null
  return typeof c === 'string' ? c : (c.id ?? null)
}

function isSoonActive(lesson: Lesson): boolean {
  if (lesson.contentStatus !== 'soon') return false
  // Mirror ContentStatusBadge semantics: an expired 'soon' window falls back
  // to normal availability, otherwise students would be blocked forever from
  // content that admin flagged pre-launch.
  if (lesson.contentStatusExpiresAt) {
    const expiry = new Date(lesson.contentStatusExpiresAt)
    if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) return false
  }
  return true
}

function statusFor(
  lesson: Lesson,
  percent: number,
  courseAccessType: string | null | undefined,
  hasPaidAccess: boolean,
  tierSlug: TierSlug | null | undefined,
  displayIndex: number,
): LessonRoadmapStatus {
  if (isSoonActive(lesson)) return 'soon'
  const access = resolveAccessType(lesson.accessType, courseAccessType)
  if (access === 'paid' && !hasPaidAccess) return 'locked'

  // Tier-based gates — the helpers themselves short-circuit when the
  // `TIER_ENFORCEMENT_ENABLED` env flag is off, so this is a no-op until
  // the kill switch is flipped. Learning rows stay visible even for free
  // past lesson 3; the per-exercise gate inside a lesson handles that.
  // `displayIndex` is 1-based within the filtered lesson type (what the
  // user actually sees as "1st exam", "2nd exam", etc.), not the raw
  // course-wide `lesson.order` which may be arbitrary across types.
  const effectiveType = getEffectiveLessonType(lesson.type)
  const userShape = { currentTier: tierSlug ?? null }
  if (effectiveType === 'practice' && !canAccessPracticeLesson(userShape, displayIndex))
    return 'locked'
  if (effectiveType === 'exam' && !canAccessExam(userShape, displayIndex)) return 'locked'

  if (percent >= 100) return 'completed'
  if (percent > 0) return 'active'
  return 'available'
}

/**
 * Pure grouping logic — exported for testing. `useLessonGrouping` is a thin
 * `useMemo` wrapper around this.
 */
export function computeLessonGroups({
  chapters,
  lessons,
  progressByLessonId,
  courseAccessType,
  hasPaidAccess,
  tierSlug,
}: GroupingInput): ChapterRoadmapGroup[] {
  const orderedChapters = [...chapters].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity),
  )

  const lessonsByChapter = new Map<string, Lesson[]>()
  for (const lesson of lessons) {
    const chId = chapterIdOf(lesson)
    if (!chId) continue
    const bucket = lessonsByChapter.get(chId) ?? []
    bucket.push(lesson)
    lessonsByChapter.set(chId, bucket)
  }

  let displayIndex = 0
  let featuredAssigned = false

  const groups: ChapterRoadmapGroup[] = []
  for (let chapterIndex = 0; chapterIndex < orderedChapters.length; chapterIndex++) {
    const chapter = orderedChapters[chapterIndex]
    const raw = lessonsByChapter.get(chapter.id) ?? []
    const orderedLessons = [...raw].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    if (orderedLessons.length === 0) continue

    const nodes: LessonRoadmapNode[] = []
    let completedCount = 0
    let hasFeatured = false

    for (const lesson of orderedLessons) {
      displayIndex += 1
      const percent = progressByLessonId[lesson.id] ?? 0
      const status = statusFor(
        lesson,
        percent,
        courseAccessType,
        hasPaidAccess,
        tierSlug,
        displayIndex,
      )
      if (status === 'completed') completedCount += 1

      // First non-completed, non-locked lesson becomes the featured "active"
      // one — matches the mockup's auto-expand + hero focus behavior.
      const canFeature = !featuredAssigned && (status === 'active' || status === 'available')
      if (canFeature) {
        featuredAssigned = true
        hasFeatured = true
      }

      nodes.push({
        lesson,
        chapterSlug: chapter.slug ?? '',
        displayIndex,
        progressPercent: percent,
        status,
        isFeatured: canFeature,
      })
    }

    groups.push({
      chapter,
      chapterIndex,
      lessons: nodes,
      completedCount,
      totalCount: nodes.length,
      hasFeatured,
    })
  }

  return groups
}

export function useLessonGrouping(input: GroupingInput): ChapterRoadmapGroup[] {
  return useMemo(
    () => computeLessonGroups(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      input.chapters,
      input.lessons,
      input.progressByLessonId,
      input.courseAccessType,
      input.hasPaidAccess,
      input.tierSlug,
    ],
  )
}

export function findFeaturedNode(groups: ChapterRoadmapGroup[]): LessonRoadmapNode | null {
  for (const g of groups) {
    for (const n of g.lessons) if (n.isFeatured) return n
  }
  return null
}

export function countTotals(groups: ChapterRoadmapGroup[]): { total: number; completed: number } {
  let total = 0
  let completed = 0
  for (const g of groups) {
    total += g.totalCount
    completed += g.completedCount
  }
  return { total, completed }
}
