'use client'

import { EmptyLessonPlaceholder } from '../EmptyLessonPlaceholder'
import type { Lesson, Media } from '@/infra/types/content'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'
import { ExerciseWorkspace } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseSlug]/_components/ExerciseWorkspace'
import { ExercisesPager } from '../ExercisesPager'
import { PdfLessonPager } from '../PdfLessonPager'
import { ChatInterface } from '@/ui/web/chat'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'
import { BookOpen, ChevronLeft, FileText, Layers } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useLessonIntroPage } from './useLessonIntroPage'

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
}: LessonIntroPageProps) {
  const t = useTranslations('courses')
  const searchParams = useSearchParams()
  const deepLinkedExerciseId = searchParams.get('exerciseId')

  const { pageState, handleStart } = useLessonIntroPage({
    deepLinkedExerciseId,
  })

  const exerciseCount = useMemo(() => blocks.filter((b) => b.type === 'exercise').length, [blocks])
  const contentPageCount = useMemo(
    () => blocks.filter((b) => b.type === 'contentPage').length,
    [blocks],
  )
  const pdfCount = mediaFiles.length

  const hasExerciseContent = exercises.some((e) => {
    if (Array.isArray(e.content)) return e.content.length > 0
    if (e.content && typeof e.content === 'object' && 'blocks' in e.content) {
      return (
        Array.isArray((e.content as { blocks?: unknown[] }).blocks) &&
        (e.content as { blocks: unknown[] }).blocks.length > 0
      )
    }
    return false
  })

  const contentType = hasExerciseContent ? 'exercises' : pdfCount > 0 ? 'pdf' : 'scroll'

  const workspaceChatContent = showChat ? (
    <ChatInterface
      lessonId={lesson.id}
      translationNamespace="courses"
      showMathTools={true}
      formulaSheet={formulaSheet}
    />
  ) : null

  if (pageState === 'workspace') {
    return (
      <ExerciseWorkspace
        exerciseTitle={lesson.title}
        backUrl={backUrl}
        primaryContent={<EmptyLessonPlaceholder lessonTitle={lesson.title} />}
        chatContent={workspaceChatContent}
      />
    )
  }

  if (pageState === 'exercises') {
    return (
      <ExercisesPager
        exercises={exercises}
        lessonTitle={lesson.title}
        backUrl={backUrl}
        courseSlug={courseSlug}
        chapterSlug={chapterSlug}
        lessonSlug={lessonSlug}
        lessonId={lessonId}
        gradeLevel={gradeLevel}
        mediaMap={mediaMap}
        showChat={showChat}
        formulaSheet={formulaSheet}
      />
    )
  }

  if (pageState === 'pdf') {
    return (
      <PdfLessonPager
        validFiles={mediaFiles}
        lessonTitle={lesson.title}
        backUrl={backUrl}
        courseSlug={courseSlug}
        chapterSlug={chapterSlug}
        lessonSlug={lessonSlug}
        lessonId={lessonId}
        gradeLevel={gradeLevel}
        chatLessonId={lesson.id}
        showChat={showChat}
        formulaSheet={formulaSheet}
        initialPageState={{ type: 'pdf', pageNumber: 1 }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 py-section-md md:py-section-lg max-w-3xl">
          <div className="space-y-8">
            <header className="text-center">
              <span className="inline-block px-4 py-1.5 bg-muted text-muted-foreground rounded-full text-label tracking-[0.2em] uppercase mb-5 border border-border/40">
                {t('lessonIntro')}
              </span>
              <h1 className="text-display-md md:text-display-lg font-medium leading-tight text-foreground mb-3">
                {lesson.title}
              </h1>
              {lesson.description ? (
                <p className="text-muted-foreground text-body-md mt-3 max-w-xl mx-auto">
                  {lesson.description}
                </p>
              ) : null}
              <div className="w-20 h-1 bg-primary mx-auto rounded-full mt-5" />
            </header>

            <div className="bg-card rounded-3xl p-card-padding-lg md:p-10 border border-border/60 shadow-card-hover shadow-muted/50 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-card shadow-primary/10 border border-primary/20">
                <BookOpen className="w-9 h-9 text-primary" />
              </div>

              <h2 className="text-display-xl font-medium mb-4 text-foreground">
                {t('lessonIntroWelcome')}
              </h2>

              {/* Content type indicators */}
              {(exerciseCount > 0 || contentPageCount > 0 || pdfCount > 0) && (
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-muted rounded-2xl border border-border/60 mb-10">
                  {exerciseCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      <span className="text-primary text-heading-xl font-medium">
                        {exerciseCount}
                      </span>
                      <span className="text-label text-muted-foreground uppercase tracking-wider">
                        {t('exercise')}
                      </span>
                    </div>
                  )}
                  {exerciseCount > 0 && pdfCount > 0 && <div className="w-px h-5 bg-border/60" />}
                  {pdfCount > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-primary text-heading-xl font-medium">{pdfCount}</span>
                      <span className="text-label text-muted-foreground uppercase tracking-wider">
                        {t('pdfLessonPagerDocuments')}
                      </span>
                    </div>
                  )}
                  {(exerciseCount > 0 || pdfCount > 0) && contentPageCount > 0 && (
                    <div className="w-px h-5 bg-border/60" />
                  )}
                  {contentPageCount > 0 && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-primary text-heading-xl font-medium">
                        {contentPageCount}
                      </span>
                      <span className="text-label text-muted-foreground uppercase tracking-wider">
                        {t('pages')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => handleStart(contentType)}
                size="lg"
                className="w-full py-section-sm rounded-2xl text-body-lg shadow-card shadow-primary/20 hover:shadow-card-hover hover:shadow-primary/30 transition-all duration-slow cursor-pointer"
              >
                {t('lessonIntroStart')}{' '}
                <ChevronLeft className="w-5 h-5 ms-2 rtl:rotate-0 ltr:rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
