/**
 * @fileType hook
 * @domain frontend
 * @pattern lesson-roadmap-grouping
 * @ai-summary Pure grouping helper for the lessons roadmap: orders chapters + lessons, resolves each lesson's status (soon / locked / completed / active / available) via ContentStatusBadge-compatible logic, and marks the first non-completed non-locked lesson across the whole roadmap as the featured "next up". No React state or side effects.
 */

import { useMemo } from 'react'
import type { Chapter, Lesson } from '@/infra/types/content'
import { resolveAccessType } from '@/infra/auth/access-types'
import {
  canAccessExam,
  canAccessPracticeLesson,
  type OpenedLessonIds,
  type TierSlug,
} from '@/lib/tiers'
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
  /**
   * Optional map of lesson id → ISO timestamp of the student's most recent
   * interaction. When provided, the featured "next up" lesson becomes the
   * most-recently-accessed non-completed, non-locked lesson instead of the
   * first available one in course order. Falls back to the first-in-order
   * logic when no accessible lesson has a timestamp.
   */
  lastAccessedByLessonId?: Record<string, string>
  courseAccessType: string | null | undefined
  hasPaidAccess: boolean
  /**
   * Current user's tier slug. When omitted, no tier gating is applied — only
   * the legacy access-type path. Also unused in practice when the global
   * `NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED` switch is off (the gate helpers short-circuit).
   */
  tierSlug?: TierSlug | null
  /**
   * Lessons the user has already opened, per type — the free-tier counter
   * (TIERS.md). Omitted = nothing opened yet.
   */
  openedLessons?: OpenedLessonIds
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

function resolveLessonLock(
  lesson: Lesson,
  percent: number,
  courseAccessType: string | null | undefined,
  hasPaidAccess: boolean,
  tierSlug: TierSlug | null | undefined,
  openedLessons: OpenedLessonIds | undefined,
): { status: LessonRoadmapStatus; isTierLocked: boolean } {
  if (isSoonActive(lesson)) return { status: 'soon', isTierLocked: false }
  const access = resolveAccessType(lesson.accessType, courseAccessType)
  if (access === 'paid' && !hasPaidAccess) return { status: 'locked', isTierLocked: false }

  // Tier-based gates — the helpers themselves short-circuit when the
  // `NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED` env flag is off, so this is a no-op until
  // the kill switch is flipped. Learning rows stay visible for every tier;
  // the per-exercise gate inside a lesson handles the cap. Practice/exam
  // rows lock once the user has opened 3 distinct lessons of that type and
  // this one isn't among them — position in the course doesn't matter.
  const effectiveType = getEffectiveLessonType(lesson.type)
  const userShape = { currentTier: tierSlug ?? null }
  if (
    effectiveType === 'practice' &&
    !canAccessPracticeLesson(userShape, lesson.id, openedLessons?.practice ?? [])
  )
    return { status: 'locked', isTierLocked: true }
  if (effectiveType === 'exam' && !canAccessExam(userShape, lesson.id, openedLessons?.exam ?? []))
    return { status: 'locked', isTierLocked: true }

  if (percent >= 100) return { status: 'completed', isTierLocked: false }
  if (percent > 0) return { status: 'active', isTierLocked: false }
  return { status: 'available', isTierLocked: false }
}

/**
 * Pure grouping logic — exported for testing. `useLessonGrouping` is a thin
 * `useMemo` wrapper around this.
 */
export function computeLessonGroups({
  chapters,
  lessons,
  progressByLessonId,
  lastAccessedByLessonId,
  courseAccessType,
  hasPaidAccess,
  tierSlug,
  openedLessons,
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

  // Two-pass: build all nodes first (so status/lock/displayIndex are known),
  // then pick exactly one featured lesson across the whole roadmap. The
  // picker prefers the most-recently-accessed accessible non-completed
  // lesson (so students land on "where I left off" / "the one I just
  // finished puts me on the next one"), and falls back to the first
  // in-order active/available lesson when no timestamp is available (first
  // visit, legacy progress rows without `lastAccessedAt`, etc.).
  const groups: ChapterRoadmapGroup[] = []
  let displayIndex = 0

  for (let chapterIndex = 0; chapterIndex < orderedChapters.length; chapterIndex++) {
    const chapter = orderedChapters[chapterIndex]
    const raw = lessonsByChapter.get(chapter.id) ?? []
    const orderedLessons = [...raw].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    if (orderedLessons.length === 0) continue

    const nodes: LessonRoadmapNode[] = []
    let completedCount = 0

    for (const lesson of orderedLessons) {
      displayIndex += 1
      const percent = progressByLessonId[lesson.id] ?? 0
      const { status, isTierLocked } = resolveLessonLock(
        lesson,
        percent,
        courseAccessType,
        hasPaidAccess,
        tierSlug,
        openedLessons,
      )
      if (status === 'completed') completedCount += 1

      nodes.push({
        lesson,
        chapterSlug: chapter.slug ?? '',
        displayIndex,
        progressPercent: percent,
        status,
        isFeatured: false,
        isTierLocked,
      })
    }

    groups.push({
      chapter,
      chapterIndex,
      lessons: nodes,
      completedCount,
      totalCount: nodes.length,
      hasFeatured: false,
    })
  }

  const candidates: LessonRoadmapNode[] = []
  for (const g of groups) {
    for (const n of g.lessons) {
      if (n.status === 'active' || n.status === 'available') candidates.push(n)
    }
  }

  let featured: LessonRoadmapNode | null = null
  if (candidates.length > 0) {
    const withTs = candidates
      .map((n) => ({ node: n, ts: lastAccessedByLessonId?.[n.lesson.id] ?? null }))
      .filter((entry): entry is { node: LessonRoadmapNode; ts: string } => entry.ts !== null)

    if (withTs.length > 0) {
      withTs.sort((a, b) => b.ts.localeCompare(a.ts))
      featured = withTs[0].node
    } else {
      featured = candidates[0]
    }
  }

  if (featured) {
    for (const g of groups) {
      for (const n of g.lessons) {
        if (n === featured) {
          n.isFeatured = true
          g.hasFeatured = true
        }
      }
    }
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
      input.lastAccessedByLessonId,
      input.courseAccessType,
      input.hasPaidAccess,
      input.tierSlug,
      input.openedLessons,
    ],
  )
}

export function findFeaturedNode(groups: ChapterRoadmapGroup[]): LessonRoadmapNode | null {
  for (const g of groups) {
    for (const n of g.lessons) if (n.isFeatured) return n
  }
  return null
}

/**
 * The lesson the student would naturally start *after* the featured one.
 * Drives the "next lesson" quick-link under the hero so the student has an
 * easy jump to the upcoming lesson without scanning the chapter list. Walks
 * the groups in course order from the position of the featured lesson and
 * returns the next node that is not completed and not locked/soon.
 */
export function findNextSuggestionNode(
  groups: ChapterRoadmapGroup[],
  featured: LessonRoadmapNode | null,
): LessonRoadmapNode | null {
  const flat: LessonRoadmapNode[] = []
  for (const g of groups) flat.push(...g.lessons)
  const startIndex = featured ? flat.findIndex((n) => n === featured) : -1
  for (let i = startIndex + 1; i < flat.length; i++) {
    const n = flat[i]
    if (n.status === 'available' || n.status === 'active') return n
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
