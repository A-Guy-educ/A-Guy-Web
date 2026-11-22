'use client'

/**
 * The course page in the private-lesson demo's layout (styles under `.pl-hub`
 * in `@/ui/web/privateLesson/private-lesson-hub.css`): the course name, the
 * teacher's welcome with four starting points, the composer, then the last
 * lesson and all content — learning / practice / exams, each as chapters of
 * our lesson cards.
 */
import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { useExamCountdown } from '@/client/hooks/useExamCountdown'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import type { Chapter, Course, Lesson } from '@/infra/types/content'
import type { LessonProgress } from '../types'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { BarChart3, GraduationCap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CourseAnalytics } from '../CourseAnalytics'
import { CourseComposer, type CourseComposerHandle } from '../CourseComposer'
import { buildLessonHref } from '../CourseComposer/courseComposerLinks'
import { CourseLastLesson } from '../CourseHub/CourseLastLesson'
import { CourseWelcome, type CourseHubAction } from '../CourseHub/CourseWelcome'
import { pickContinueLesson } from '../CourseHub/pickContinueLesson'
import { CONTENT_TABS, CourseTabs, type ContentTab } from '../CourseTabs'
import { LessonListTab } from '../LessonListTab'
import { buildLessonSearchNodes } from '../LessonListTab/buildLessonSearchNodes'
import { LocaleFallbackBanner } from '../../../_components/LocaleFallbackBanner'
import { ShareButton } from '@/ui/web/shared/ShareButton'
import { useTeacherProfileLabel } from '@/ui/web/chat/hooks/useTeacherProfileLabel'

import '@/ui/web/privateLesson/private-lesson.css'
import '@/ui/web/privateLesson/private-lesson-hub.css'

interface CoursePageContentProps {
  course: Course
  chapters: Chapter[]
  lessons: Lesson[]
  courseSlug: string
  lessonProgressMap?: Record<string, LessonProgress>
  isLocaleFallback?: boolean
  /**
   * Pre-resolved buy URL for the parent course's locked lessons. Resolved
   * server-side once per render; forwarded to LessonListTab → CourseLessonCard
   * so the per-card CTA routes to the right product instead of /products.
   */
  purchaseHref?: string
}

const LESSON_TYPE_BY_TAB = { learn: 'learning', practice: 'practice', exams: 'exam' } as const

export function CoursePageContent({
  course,
  chapters,
  lessons,
  courseSlug,
  lessonProgressMap = {},
  isLocaleFallback = false,
  purchaseHref,
}: CoursePageContentProps) {
  const t = useTranslations('coursePage')
  const tCourses = useTranslations('courses')
  const locale = useLocale()
  // Persist active tab per-course so returning from a lesson via "back to home
  // page" lands on the originating tab. SSR starts on 'learn' (default), then a
  // mount-time effect swaps to the stored value — avoids a hydration mismatch
  // vs. reading localStorage during render.
  const [activeTab, setActiveTab] = useState<ContentTab>('learn')
  useEffect(() => {
    const raw = readStoredCourseTab(courseSlug)
    if (raw && raw !== activeTab) setActiveTab(raw)
    // Only on mount: later tab changes are written below, not re-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug])
  useEffect(() => {
    writeStoredCourseTab(courseSlug, activeTab)
  }, [courseSlug, activeTab])
  const { hasUpcomingExam, daysUntil } = useExamCountdown(course.id)

  const searchNodes = useMemo(
    () => buildLessonSearchNodes({ chapters, lessons }),
    [chapters, lessons],
  )

  const { user } = useCurrentUser()
  const { label: teacherLabel, slug: teacherSlug } = useTeacherProfileLabel(Boolean(user))
  const composerRef = useRef<CourseComposerHandle>(null)
  const allContentRef = useRef<HTMLHeadingElement>(null)
  const lastLessonRef = useRef<HTMLHeadingElement>(null)
  const continueLesson = useMemo(
    () => pickContinueLesson(searchNodes, lessonProgressMap),
    [searchNodes, lessonProgressMap],
  )
  const continueHref = continueLesson ? buildLessonHref(continueLesson, courseSlug) : null

  // Each starting point opens the content it belongs to and hands the student
  // to the composer. Homework opens the photo picker straight from the click
  // (browsers only allow that inside the user gesture).
  const handleAction = (action: CourseHubAction) => {
    if (action === 'homework') {
      composerRef.current?.openPhotoPicker()
      return
    }
    setActiveTab(action)
    composerRef.current?.focus()
  }

  const openExams = () => {
    setActiveTab('exams')
    allContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="pl-hub" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <CourseAnalytics courseId={course.id} courseTitle={course.title} />

      {isLocaleFallback && (
        <div className="container mx-auto px-3 sm:px-6 pt-section-sm max-w-5xl">
          <LocaleFallbackBanner isLocaleFallback={isLocaleFallback} />
        </div>
      )}

      <h1 className="hub-course">
        {course.title}
        <ShareButton title={course.title} ariaLabel={tCourses('shareCourse')} />
      </h1>

      {searchNodes.length > 0 && (
        <>
          <CourseWelcome
            teacherSlug={teacherSlug}
            teacherLabel={teacherLabel}
            continueLesson={
              continueLesson && continueHref
                ? { title: continueLesson.lesson.title, href: continueHref }
                : null
            }
            examDaysUntil={hasUpcomingExam ? daysUntil : null}
            onAction={handleAction}
          />
          <CourseComposer
            ref={composerRef}
            nodes={searchNodes}
            courseId={course.id}
            courseSlug={courseSlug}
            courseTitle={course.title}
            onOpenExams={openExams}
            isSignedIn={Boolean(user)}
          />
        </>
      )}

      <section className="browse">
        <button
          type="button"
          className="browse-cue"
          onClick={() =>
            (lastLessonRef.current ?? allContentRef.current)?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }
        >
          {t('hub.browseCue')}
          <svg viewBox="0 0 24 24" className="pl-icon" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {continueLesson && continueHref && (
          <>
            <h2 ref={lastLessonRef}>{t('hub.lastHeading')}</h2>
            <CourseLastLesson
              node={continueLesson}
              href={continueHref}
              percent={lessonProgressMap[continueLesson.lesson.id]?.percent ?? 0}
            />
          </>
        )}

        <h2 ref={allContentRef}>{t('hub.allContent')}</h2>
        <CourseTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <LessonListTab
          key={activeTab}
          lessons={lessons}
          chapters={chapters}
          courseSlug={courseSlug}
          courseId={course.id}
          courseAccessType={course.accessType}
          gradeLevel={course.courseLabel || ''}
          lessonProgressMap={lessonProgressMap}
          lessonType={LESSON_TYPE_BY_TAB[activeTab]}
          purchaseHref={purchaseHref}
        />

        <div className="hub-links">
          <SystemLink href={`/stats?courseId=${course.id}`} className="demo-view">
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            {t('statsAndPerformance')}
          </SystemLink>
          <SystemLink href="/study-plan" className="demo-view">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
            {t('upcomingExam')}
          </SystemLink>
        </div>
      </section>
    </div>
  )
}

const TAB_STORAGE_PREFIX = 'aguy:courseTab:'

function readStoredCourseTab(courseSlug: string): ContentTab | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${TAB_STORAGE_PREFIX}${courseSlug}`)
    // A stored 'ask' (the old fourth tab) falls back to the default.
    return (CONTENT_TABS as readonly string[]).includes(raw ?? '') ? (raw as ContentTab) : null
  } catch {
    return null
  }
}

function writeStoredCourseTab(courseSlug: string, tab: ContentTab): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${TAB_STORAGE_PREFIX}${courseSlug}`, tab)
  } catch {
    // Private-mode / quota exceeded: silently drop; non-essential UX.
  }
}
