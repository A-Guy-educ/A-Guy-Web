'use client'

import { useEffect, useState } from 'react'
import { getUserProfile } from '@/client/state/localStorage/userProfile'
import { ChatInterface } from '@/ui/web/chat'
import { logger } from '@/infra/utils/logger'
import { cn } from '@/infra/utils/ui'
import { Skeleton, SkeletonText } from '@/ui/web/components/skeleton'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { BookOpen } from 'lucide-react'
import { ExerciseWorkspace } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseSlug]/_components/ExerciseWorkspace'
import { AskPrimaryContent } from '../AskPrimaryContent'

interface AskContentProps {
  /** The conversation's contextKey — conversation must already exist in DB */
  conversationContextKey?: string
  /**
   * When provided, skips the user-profile-based course lookup. Used when
   * AskContent is embedded inside a course page where the courseId is
   * already known.
   */
  initialCourseId?: string
  /**
   * Override the LessonMenu back destination. Defaults to `/ask` for the
   * standalone page; embedders (e.g. the course page) pass their own URL
   * so the back button returns to the enclosing surface instead.
   */
  backUrl?: string
  /**
   * Back-button semantics for the floating LessonMenu. `'lesson'` pushes
   * straight to `backUrl` with a "back to home page" label; `'standalone'`
   * (default for the /ask page) uses browser history and a generic label.
   */
  menuVariant?: 'lesson' | 'standalone'
}

export function AskContent({
  conversationContextKey,
  initialCourseId,
  backUrl = '/ask',
  menuVariant,
}: AskContentProps) {
  const t = useTranslations('homepage.ask')
  const locale = useLocale()
  const [courseId, setCourseId] = useState<string>(initialCourseId ?? '')
  const [isLoading, setIsLoading] = useState(!initialCourseId)

  useEffect(() => {
    if (initialCourseId) return
    async function loadCourse() {
      const profile = getUserProfile()
      if (!profile?.gradeLevel) {
        window.location.href = '/'
        return
      }

      try {
        const response = await fetch(
          `/api/chapters/by-grade?grade=${profile.gradeLevel}&locale=${locale}`,
        )
        if (response.ok) {
          const data = await response.json()
          const courseIdFromData = data.courseId || ''
          if (courseIdFromData) {
            setCourseId(courseIdFromData)
          } else {
            const chapters = data.chapters || []
            if (chapters.length > 0) {
              const course = chapters[0].course
              const id = typeof course === 'string' ? course : course?.id
              if (id) setCourseId(id)
            }
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        logger.error({ err }, 'Failed to load course')
      } finally {
        setIsLoading(false)
      }
    }

    loadCourse()
  }, [locale, initialCourseId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Top bar skeleton */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>

        {/* Content area skeleton */}
        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="flex-1 p-card-padding space-y-4">
            <Skeleton className="h-8 w-64" />
            <SkeletonText lines={4} />
          </div>
          <div className="hidden lg:block w-[400px] border-s border-border p-card-padding-sm space-y-4">
            <Skeleton className="h-6 w-32" />
            <SkeletonText lines={3} />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  if (!courseId) {
    return (
      <div className={cn('flex items-center justify-center h-screen')}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-body-lg font-medium text-muted-foreground">{t('noCourse')}</p>
          <p className="text-body-sm text-muted-foreground/60 mt-1">{t('noCourseHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <ExerciseWorkspace
      exerciseTitle={t('pageTitle')}
      backUrl={backUrl}
      menuVariant={menuVariant}
      primaryContent={<AskPrimaryContent />}
      chatContent={
        <ChatInterface
          courseId={courseId}
          contextKeyOverride={conversationContextKey}
          translationNamespace="homepage.ask"
        />
      }
    />
  )
}
