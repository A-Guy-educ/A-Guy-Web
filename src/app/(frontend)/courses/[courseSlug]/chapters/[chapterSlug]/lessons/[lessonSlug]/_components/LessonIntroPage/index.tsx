'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'

import { ExerciseWorkspace } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseSlug]/_components/ExerciseWorkspace'
import type { Lesson, LessonPrerequisite, Media } from '@/infra/types/content'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'
import { getExerciseBlocks } from '@/lib/exercises/getExerciseBlocks'
import { getLessonContentBlocks } from '@/lib/lessons/getLessonContentBlocks'
import { getEffectiveLessonType } from '@/server/constants/lesson-types'
import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { ChatInterface } from '@/ui/web/chat'
import { BackToCourses } from '@/app/(frontend)/courses/_components/BackToCourses'
import { Card, CardContent } from '@/ui/web/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { trackOnboardingStep } from '@/client/utils/guest-session-beacon'
import { GoogleLoginButton } from '@/ui/web/auth/GoogleLoginButton'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { LessonLandingContent } from '@/lib/lessons/buildLessonLanding'

import { ContentPagesPreamble } from '../ContentPagesPreamble'
import { DualModeLessonView } from '../DualModeLessonView'
import type { LessonMode } from '../DualModeLessonView/useLessonViewMode'
import { EmptyLessonPlaceholder } from '../EmptyLessonPlaceholder'
import {
  LessonLandingExplanation,
  LessonLandingHero,
  LessonLandingPractice,
  LessonLandingRelated,
  LessonLandingWorkedExample,
} from '../LessonLanding'
import { useLessonIntroPage } from './useLessonIntroPage'
import { ShareButton } from '@/ui/web/shared/ShareButton'

interface LessonProgressSummary {
  completed: number
  total: number
  percent: number
  status?: string
}

interface LessonIntroPageProps {
  lesson: Lesson
  /** Parent course title — rendered as the first breadcrumb segment above the lesson title. */
  courseTitle?: string
  /** Parent chapter title — rendered as the second breadcrumb segment above the lesson title. */
  chapterTitle?: string
  blocks: ResolvedLessonBlock[]
  /** Pre-rendered content page bodies, keyed by content page ID (built server-side) */
  contentPageBodies?: Record<string, React.ReactNode>
  backUrl: string
  showChat: boolean
  formulaSheet?: import('@/infra/types/content').FormulaSheet | null
  /** Exercises for this lesson (used to determine if lesson has exercises) */
  exercises?: import('@/infra/types/content').Exercise[]
  /** Media files (PDFs) for this lesson */
  mediaFiles?: Media[]
  mediaMap?: Record<string, Media>
  courseSlug?: string
  chapterSlug?: string
  lessonSlug?: string
  lessonId?: string
  gradeLevel?: string
  progress?: LessonProgressSummary
  nextLesson?: Pick<Lesson, 'title' | 'slug'> | null
  /**
   * Next lesson of the SAME type (learning / practice / exam). Used by the
   * chatview end-of-lesson summary card so the student can jump to the next
   * learning lesson after finishing a learning lesson, instead of landing on
   * whatever practice/exam row sits between the two.
   */
  nextSameTypeLesson?: {
    slug: string | null
    title: string | null
    chapterSlug: string | null
  } | null
  /** Populated prerequisite lessons with URL info */
  prerequisites?: LessonPrerequisite[]
  isLocaleFallback?: boolean
  /**
   * 1-based position of this lesson in the order the user first opened
   * learning lessons. `null` when the lesson isn't type=learning (practice/exam
   * are gated on the lesson row and the page server-side). Used by the free-tier
   * per-exercise lock in ExercisesPager.
   */
  lessonLearningIndex?: number | null
  /** Worked example, practice questions and hero sketch pulled from the exercises. */
  landing?: LessonLandingContent
}

const EMPTY_LANDING: LessonLandingContent = { visual: null, workedExample: null, practice: [] }

function splitKeywords(value?: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function plainText(value?: string | null) {
  return (
    value
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''
  )
}

// Convert sentence boundaries (`.`, `!`, `?` followed by whitespace) into
// markdown paragraph breaks so the lesson description renders one sentence
// per visual line — matches the sentence-per-line treatment the ContentPage
// renderer already applies inside lesson content.
function splitSentencesAsMarkdownParagraphs(value: string): string {
  if (!value) return ''
  return value.replace(/([.!?])\s+/g, '$1\n\n')
}

// We render the description as markdown + KaTeX so admin-authored `$...$` math
// is rendered instead of leaking out as literal `$x+5=12$`. Admin descriptions
// are stored as HTML, so tags are stripped first — formatting is lost but math
// is preserved and renders correctly.

export function LessonIntroPage({
  lesson,
  courseTitle,
  chapterTitle,
  blocks,
  contentPageBodies,
  backUrl,
  showChat,
  formulaSheet,
  exercises = [],
  mediaFiles = [],
  mediaMap = {},
  courseSlug = '',
  chapterSlug = '',
  lessonSlug = '',
  lessonId = '',
  gradeLevel = '',
  progress,
  nextLesson,
  nextSameTypeLesson,
  prerequisites = [],
  isLocaleFallback = false,
  lessonLearningIndex = null,
  landing = EMPTY_LANDING,
}: LessonIntroPageProps) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common.languageSwitcher')
  const searchParams = useSearchParams()
  const deepLinkedExerciseId = searchParams.get('exerciseId')
  // The pager accepts `?section=N&block=M` (default section=0) and the legacy
  // `?block=N` shape. Today every lesson is a single section so `block` alone
  // drives resolution; the new contract is emitted by /exercises/[slug] and
  // /content/[slug] route stubs.
  const blockParam = searchParams.get('block')
  const parsedBlockIndex =
    blockParam !== null && blockParam !== '' && !Number.isNaN(Number(blockParam))
      ? Number(blockParam)
      : null
  const exerciseCount = exercises.length
  const contentPageCount = useMemo(
    () =>
      Array.isArray(blocks) ? blocks.filter((block) => block.type === 'contentPage').length : 0,
    [blocks],
  )
  const lessonContentBlocks = useMemo(() => getLessonContentBlocks(lesson), [lesson])
  const { pageState, handleStart, handleFinishPreamble } = useLessonIntroPage({
    deepLinkedExerciseId,
    hasContentPagesPreamble: contentPageCount > 0,
    initialBlockIndex: parsedBlockIndex,
  })

  // Anonymous visitors are allowed to view the intro (per SEO and share-link
  // flows) but clicking "Start" must prompt them to sign in — the lesson
  // content itself is behind auth. `isLoading` keeps the button neutral during
  // the OAuth flicker window noted in useCurrentUser docs.
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const isAnonymous = !user && !isAuthLoading
  const pathname = usePathname()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const requestStart = (index: number) => {
    if (isAnonymous) {
      setShowLoginPrompt(true)
      trackOnboardingStep(
        'signupPromptShown',
        lessonId ? { type: 'lesson', id: lessonId } : undefined,
      )
      return
    }
    handleStart(index)
  }
  const pdfCount = mediaFiles.length
  const description = splitSentencesAsMarkdownParagraphs(plainText(lesson.description))

  // Touch the lesson's progress record on view so `lastAccessedAt` reflects
  // this visit, which is what the course page's hero card ("where I left off"
  // featured lesson) sorts by. We re-POST the current status + percent so
  // the merge in /api/progress doesn't downgrade a completed lesson back to
  // in-progress — this is a timestamp refresh, not a status change.
  const touchedRef = useRef(false)
  const touchStatus: 'completed' | 'in_progress' =
    progress?.status === 'completed' || (progress?.percent ?? 0) >= 100
      ? 'completed'
      : 'in_progress'
  const touchPercent = Math.min(100, Math.max(0, progress?.percent ?? 0))
  useEffect(() => {
    if (touchedRef.current) return
    if (isAnonymous || isAuthLoading) return
    if (!gradeLevel) return
    if (!lessonId) return
    touchedRef.current = true
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recordType: 'lesson',
        recordId: lessonId,
        completionPercentage: touchPercent,
        status: touchStatus,
        gradeLevel,
      }),
    }).catch(() => {
      /* silent — this is a best-effort "last accessed" touch */
    })
  }, [isAnonymous, isAuthLoading, gradeLevel, lessonId, touchPercent, touchStatus])

  const hasExerciseContent = exercises.some((exercise) => {
    if (!exercise || typeof exercise !== 'object') return false
    return getExerciseBlocks(exercise).length > 0
  })

  /** True when blocks contain at least one contentPage block — routes to LessonPager instead of ExercisesPager */
  const hasContentPagesInBlocks = contentPageCount > 0

  const hasMedia = pdfCount > 0
  // Exam lessons swap the scroll (pdf) tab for the test tab so students see
  // the batch-graded test view instead of the read-only worksheet. Learning
  // and practice lessons keep the original scroll + interactive pair.
  const isExamLesson = getEffectiveLessonType(lesson.type) === 'exam'

  // Compute the shape-derived default list first — used when the admin hasn't
  // explicitly set `visibleRenderers` on the lesson doc.
  const computedRenderers: LessonMode[] = []
  if (hasMedia) computedRenderers.push('media')
  if (hasExerciseContent) {
    computedRenderers.push(isExamLesson ? 'test' : 'pdf', 'interactive')
  } else if (hasContentPagesInBlocks) computedRenderers.push('interactive')

  // Admin-set `visibleRenderers` on the lesson doc is the source of truth
  // when present — it's what lets opt-in tabs like 'chat' (no data-presence
  // requirement) surface at all. DualModeLessonView still applies the media
  // data-presence guard internally, so `hasMedia` doesn't need to be
  // reasserted here.
  const VALID_MODES: readonly LessonMode[] = ['media', 'pdf', 'interactive', 'test', 'chat']
  const adminRenderers = (lesson.visibleRenderers ?? []).filter((v): v is LessonMode =>
    (VALID_MODES as readonly string[]).includes(v),
  )
  const visibleRenderers: LessonMode[] =
    adminRenderers.length > 0 ? adminRenderers : computedRenderers

  const completed = progress?.completed ?? 0
  const total = progress?.total ?? exerciseCount
  const percent = progress?.percent ?? 0
  const hasProgress = percent > 0 || completed > 0
  const isComplete = percent >= 100
  const resumeExerciseIndex = total > 0 ? Math.min(completed, total - 1) : 0
  const primaryExerciseIndex = isComplete ? 0 : hasProgress ? resumeExerciseIndex : 0
  const primaryLabel = isComplete
    ? t('lessonLobbyReview')
    : hasProgress
      ? t('lessonLobbyContinue')
      : t('lessonIntroStart')

  const workspaceChatContent = showChat ? (
    <ChatInterface
      lessonId={lesson.id}
      translationNamespace="courses"
      showMathTools={true}
      formulaSheet={formulaSheet}
    />
  ) : null

  if (pageState.type === 'workspace') {
    return (
      <ExerciseWorkspace
        exerciseTitle={lesson.title}
        backUrl={backUrl}
        primaryContent={<EmptyLessonPlaceholder lessonTitle={lesson.title} />}
        chatContent={workspaceChatContent}
        menuVariant="lesson"
      />
    )
  }

  if (pageState.type === 'preamble') {
    return (
      <ContentPagesPreamble
        lessonTitle={lesson.title}
        blocks={blocks}
        contentPageBodies={contentPageBodies}
        onFinish={() => handleFinishPreamble(pageState.initialExerciseIndex)}
      />
    )
  }

  if (pageState.type === 'content') {
    if (visibleRenderers.length === 0) {
      return (
        <ExerciseWorkspace
          exerciseTitle={lesson.title}
          backUrl={backUrl}
          primaryContent={<EmptyLessonPlaceholder lessonTitle={lesson.title} />}
          chatContent={workspaceChatContent}
          menuVariant="lesson"
        />
      )
    }

    return (
      <DualModeLessonView
        lessonId={lessonId}
        lessonTitle={lesson.title}
        backUrl={backUrl}
        courseSlug={courseSlug}
        chapterSlug={chapterSlug}
        lessonSlug={lessonSlug}
        gradeLevel={gradeLevel}
        exercises={exercises}
        interactive={{ kind: 'exercises', exercises }}
        validFiles={mediaFiles}
        mediaMap={mediaMap}
        chatLessonId={lesson.id}
        showChat={showChat}
        formulaSheet={formulaSheet}
        visibleRenderers={visibleRenderers}
        initialExerciseIndex={pageState.initialExerciseIndex}
        initialMode={
          isExamLesson && hasExerciseContent
            ? 'test'
            : hasExerciseContent || hasContentPagesInBlocks
              ? 'interactive'
              : undefined
        }
        nextLesson={nextLesson}
        nextSameTypeLesson={nextSameTypeLesson}
        lessonLearningIndex={lessonLearningIndex}
        lessonContentBlocks={lessonContentBlocks}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-5 sm:px-6 md:min-h-screen md:py-section-lg">
        <div className="flex w-full items-center justify-between">
          <ShareButton title={lesson.title} ariaLabel={t('shareLesson')} />
          <BackToCourses href={backUrl} />
        </div>

        {/* Locale fallback notice */}
        {isLocaleFallback && (
          <div className="mb-6">
            <Card className="bg-warning/10 border-warning/30 animate-fade-in">
              <CardContent className="p-card-padding flex flex-row items-start gap-content-gap-sm">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-warning" />
                </div>
                <p className="text-body-sm text-warning">{tCommon('fallbackNotice')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-section-xs">
          <LessonLandingHero
            breadcrumb={[gradeLevel, courseTitle, chapterTitle, lesson.topic].filter(
              (part): part is string => Boolean(part),
            )}
            title={lesson.title}
            description={description}
            intro={lesson.intro}
            objective={lesson.lessonObjective}
            estimatedMinutes={lesson.estimatedMinutes}
            exerciseCount={exerciseCount}
            visual={landing.visual}
            primaryLabel={primaryLabel}
            progressPercent={percent}
            showRestart={hasProgress}
            onStart={() => requestStart(primaryExerciseIndex)}
            onRestart={() => requestStart(0)}
          />
          <LessonLandingExplanation
            explanation={lesson.publicExplanation}
            formulas={lesson.formulas}
            commonMistakes={lesson.commonMistakes}
          />
          <LessonLandingWorkedExample
            example={landing.workedExample}
            fallbackText={lesson.examples}
          />
          <LessonLandingPractice questions={landing.practice} />
          <LessonLandingRelated
            keywords={splitKeywords(lesson.meta?.keywords)}
            prerequisites={prerequisites}
            nextLessonTitle={nextLesson?.title}
          />
        </div>
      </main>

      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent allowDismiss={true} className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-heading-xl">{t('startLoginPromptTitle')}</DialogTitle>
            <DialogDescription className="mt-2">
              {t('startLoginPromptDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            <GoogleLoginButton returnTo={pathname} className="w-full" trackAsOnboarding />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
