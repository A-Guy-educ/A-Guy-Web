'use client'

import { useMemo } from 'react'
import { BookOpen, ChevronLeft, FileText, Layers, RotateCcw, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { ExerciseWorkspace } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseSlug]/_components/ExerciseWorkspace'
import type { Lesson, Media } from '@/infra/types/content'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'
import { ChatInterface } from '@/ui/web/chat'
import { Button } from '@/ui/web/components/button'
import { Progress } from '@/ui/web/components/progress'
import { useTranslations } from '@/ui/web/providers/I18n'

import { DualModeLessonView } from '../DualModeLessonView'
import type { LessonMode } from '../DualModeLessonView/useLessonViewMode'
import { EmptyLessonPlaceholder } from '../EmptyLessonPlaceholder'
import { useLessonIntroPage } from './useLessonIntroPage'

interface LessonProgressSummary {
  completed: number
  total: number
  percent: number
  status?: string
}

interface LessonIntroPageProps {
  lesson: Lesson
  blocks: ResolvedLessonBlock[]
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
}

function plainText(value?: string | null) {
  return (
    value
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''
  )
}

export function LessonIntroPage({
  lesson,
  blocks,
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
}: LessonIntroPageProps) {
  const t = useTranslations('courses')
  const searchParams = useSearchParams()
  const deepLinkedExerciseId = searchParams.get('exerciseId')
  const { pageState, handleStart } = useLessonIntroPage({ deepLinkedExerciseId })

  const exerciseCount = exercises.length
  const contentPageCount = useMemo(() => (Array.isArray(blocks) ? blocks.length : 0), [blocks])
  const pdfCount = mediaFiles.length
  const description = plainText(lesson.description)

  const hasExerciseContent = exercises.some((exercise) => {
    if (Array.isArray(exercise.content)) return exercise.content.length > 0
    if (exercise.content && typeof exercise.content === 'object' && 'blocks' in exercise.content) {
      return (
        Array.isArray((exercise.content as { blocks?: unknown[] }).blocks) &&
        (exercise.content as { blocks: unknown[] }).blocks.length > 0
      )
    }
    return false
  })

  const hasMedia = pdfCount > 0
  const visibleRenderers: LessonMode[] = []
  if (hasMedia) visibleRenderers.push('media')
  if (hasExerciseContent) visibleRenderers.push('pdf', 'interactive')

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
        initialMode={hasExerciseContent ? 'interactive' : undefined}
        nextLesson={nextLesson}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-section-md sm:px-6 md:py-section-lg">
        <section className="grid flex-1 items-center gap-content-gap-lg lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-content-gap-xs rounded-full border border-border bg-muted px-4 py-2 text-label uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('lessonIntro')}
            </div>

            <div className="space-y-4">
              <p className="text-body-md text-muted-foreground">{gradeLevel}</p>
              <h1 className="text-display-md font-medium leading-tight text-foreground md:text-display-lg">
                {lesson.title}
              </h1>
              {description ? (
                <div className="max-w-2xl space-y-2">
                  <h2 className="text-heading-md font-medium text-foreground">
                    {t('lessonLobbySummary')}
                  </h2>
                  <p className="text-body-md leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-content-gap-sm sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-card-padding shadow-elevation-1">
                <Layers className="mb-3 h-5 w-5 text-primary" />
                <p className="text-heading-lg font-medium text-foreground">{exerciseCount}</p>
                <p className="text-body-sm text-muted-foreground">{t('exercise')}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-card-padding shadow-elevation-1">
                <FileText className="mb-3 h-5 w-5 text-primary" />
                <p className="text-heading-lg font-medium text-foreground">{pdfCount}</p>
                <p className="text-body-sm text-muted-foreground">{t('pdfLessonPagerDocuments')}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-card-padding shadow-elevation-1">
                <BookOpen className="mb-3 h-5 w-5 text-primary" />
                <p className="text-heading-lg font-medium text-foreground">{contentPageCount}</p>
                <p className="text-body-sm text-muted-foreground">{t('pages')}</p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-card-padding-lg shadow-card">
              <div className="space-y-5">
                <div>
                  <h2 className="text-heading-lg font-medium text-foreground">
                    {t('lessonLobbyProgress')}
                  </h2>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {total > 0
                      ? `${completed} / ${total} ${t('exercise')}`
                      : t('lessonLobbyNoProgress')}
                  </p>
                </div>

                <Progress value={percent} className="h-2" />
                <p className="text-body-sm text-muted-foreground">
                  {isComplete
                    ? t('lessonLobbyComplete')
                    : percent > 0
                      ? t('lessonLobbyInProgress')
                      : t('lessonLobbyReady')}
                </p>

                <div className="flex flex-col gap-content-gap-sm">
                  <Button
                    onClick={() => handleStart(primaryExerciseIndex)}
                    size="lg"
                    className="w-full transition-all duration-normal"
                  >
                    {primaryLabel}
                    <ChevronLeft className="ms-2 h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
                  </Button>
                  {hasProgress ? (
                    <Button
                      onClick={() => handleStart(0)}
                      variant="outline"
                      size="lg"
                      className="w-full transition-all duration-normal"
                    >
                      <RotateCcw className="me-2 h-4 w-4" />
                      {t('lessonLobbyRestart')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {nextLesson?.title ? (
              <div className="rounded-lg border border-border bg-muted p-card-padding">
                <p className="text-label uppercase tracking-wider text-muted-foreground">
                  {t('lessonLobbyNextLesson')}
                </p>
                <p className="mt-2 text-body-md font-medium text-foreground">{nextLesson.title}</p>
              </div>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  )
}
