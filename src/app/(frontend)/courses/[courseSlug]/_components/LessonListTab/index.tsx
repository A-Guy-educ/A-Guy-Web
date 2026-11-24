/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-tab
 * @ai-summary Container for the course-lessons view. Filters lessons by lessonType (learning/practice/exam), resolves progress + entitlement, groups by chapter, then renders the demo's lesson filters and a controlled Radix accordion of ChapterAccordion items. Auto-expands the chapter containing the featured next-up lesson.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import type { Chapter, Lesson } from '@/infra/types/content'
import { getEffectiveLessonType, type LessonType } from '@/server/constants/lesson-types'
import { useTranslations } from '@/ui/web/providers/I18n'
import { useProgressMap } from '@/client/hooks/useProgressMap'
import { useChatProgressMap } from '@/client/hooks/useChatProgressMap'
import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { useOpenedLessons } from '@/client/hooks/useOpenedLessons'
import { getUserTierSlug } from '@/lib/tiers'
import { ChapterAccordion } from './ChapterAccordion'
import { CourseLessonsFilterBar } from './CourseLessonsFilterBar'
import { findFeaturedNode, useLessonGrouping } from './useLessonGrouping'
import type { FilterMode, LessonRoadmapNode } from './lessonRoadmapTypes'
import type { LessonProgress } from '../types'

interface LessonListTabProps {
  lessons: Lesson[]
  chapters: Chapter[]
  courseSlug: string
  /** Course ID used to look up paid entitlement. When omitted, no entitlement check runs. */
  courseId?: string
  /** Parent course's lesson-level accessType. Combined with each lesson's own accessType to resolve the effective tier. */
  courseAccessType?: string | null
  /** Pre-resolved entitlement flag (usually server-side). Wins over the client-side fetch when defined. */
  hasPaidAccess?: boolean
  /** Grade bucket of the course — used to scope progress reads to the correct grade. */
  gradeLevel: string
  lessonProgressMap?: Record<string, LessonProgress>
  lessonType: LessonType
  /**
   * Pre-resolved buy URL forwarded to every locked lesson row. Resolved once at
   * the container level (course page server component) so the reverse-lookup
   * fires at most once per course render, not per card.
   */
  purchaseHref?: string
}

export function LessonListTab({
  lessons,
  chapters,
  courseSlug,
  courseId,
  courseAccessType,
  hasPaidAccess: hasPaidAccessProp,
  gradeLevel,
  lessonProgressMap = {},
  lessonType,
  purchaseHref,
}: LessonListTabProps) {
  const t = useTranslations('coursePage')
  const filteredLessons = useMemo(
    () => lessons.filter((l) => getEffectiveLessonType(l.type) === lessonType),
    [lessons, lessonType],
  )

  const lessonIds = useMemo(() => filteredLessons.map((l) => l.id), [filteredLessons])
  const { progressMap, lastAccessedMap } = useProgressMap({
    recordType: 'lesson',
    recordIds: lessonIds,
    gradeLevel,
  })
  // Chat view (now the default renderer) does not write to the Progress API —
  // only to localStorage. Merge those entries in so chat-driven progress still
  // shows up on the roadmap rings and flips lessons to `completed`.
  const { chatProgressMap } = useChatProgressMap(lessonIds)

  const [hasPaidAccessClient, setHasPaidAccessClient] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    if (hasPaidAccessProp !== undefined) return
    if (!courseId) return
    let cancelled = false
    fetch(`/api/entitlements/check?courseId=${encodeURIComponent(courseId)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { hasAccess?: boolean }
        if (!cancelled) setHasPaidAccessClient(Boolean(data.hasAccess))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [courseId, hasPaidAccessProp])

  // Default to true when entitlement state is unknown — showing the CTA is a
  // downgrade, not a hard block; the page-level gate already gates paid content.
  const hasPaidAccess = hasPaidAccessProp ?? hasPaidAccessClient ?? true

  const { user } = useCurrentUser()
  const tierSlug = getUserTierSlug(user as { currentTier?: string | null } | null)
  const openedLessons = useOpenedLessons(gradeLevel)

  const progressByLessonId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const l of filteredLessons) {
      // lessonProgressMap has an entry (possibly 0) for every lesson, so `??`
      // would hide the lesson-level Progress API record — take the best of all.
      map[l.id] = Math.max(
        lessonProgressMap[l.id]?.percent ?? 0,
        progressMap[l.id] ?? 0,
        chatProgressMap[l.id] ?? 0,
      )
    }
    return map
  }, [filteredLessons, lessonProgressMap, progressMap, chatProgressMap])

  const groups = useLessonGrouping({
    chapters,
    lessons: filteredLessons,
    progressByLessonId,
    lastAccessedByLessonId: lastAccessedMap,
    courseAccessType,
    hasPaidAccess,
    tierSlug,
    openedLessons,
  })

  const featured = findFeaturedNode(groups)

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [openChapters, setOpenChapters] = useState<string[]>([])
  const [autoExpandedFor, setAutoExpandedFor] = useState<string | null>(null)

  // Auto-expand the chapter containing the featured lesson on first load
  // and whenever the featured lesson moves to a different chapter.
  useEffect(() => {
    const featuredChapterId = featured
      ? groups.find((g) => g.lessons.some((n) => n.isFeatured))?.chapter.id
      : groups[0]?.chapter.id
    if (!featuredChapterId) return
    if (autoExpandedFor === featuredChapterId) return
    setOpenChapters((prev) =>
      prev.includes(featuredChapterId) ? prev : [...prev, featuredChapterId],
    )
    setAutoExpandedFor(featuredChapterId)
  }, [autoExpandedFor, featured, groups])

  // "Started" chip in the demo = lessons the student has touched (active or
  // completed). Not-yet-opened `available` rows are filtered out so the chip
  // actually shrinks the list to the student's in-flight work.
  const visibleLessonsFor = (lessons: LessonRoadmapNode[]) => {
    if (filterMode === 'started')
      return lessons.filter((n) => n.status === 'active' || n.status === 'completed')
    return lessons
  }

  const visibleGroups = useMemo(() => {
    if (filterMode !== 'started') return groups
    return groups.filter((g) =>
      g.lessons.some((n) => n.status === 'active' || n.status === 'completed'),
    )
  }, [filterMode, groups])

  if (filteredLessons.length === 0) return null

  return (
    <>
      <CourseLessonsFilterBar mode={filterMode} onChange={setFilterMode} />

      {visibleGroups.length === 0 ? (
        <p className="notice">{t('hub.noStarted')}</p>
      ) : (
        <AccordionPrimitive.Root
          type="multiple"
          value={openChapters}
          onValueChange={setOpenChapters}
        >
          {visibleGroups.map((group) => (
            <ChapterAccordion
              key={group.chapter.id}
              group={group}
              visibleLessons={visibleLessonsFor(group.lessons)}
              courseSlug={courseSlug}
              purchaseHref={purchaseHref}
            />
          ))}
        </AccordionPrimitive.Root>
      )}
    </>
  )
}
