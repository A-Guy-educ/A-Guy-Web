/**
 * @fileType component
 * @domain lessons
 * @pattern dual-view
 * @ai-summary Tab-based lesson view supporting up to four tabs: Media (attached
 *             files), PDF (worksheet from exercise blocks), Interactive (exercise
 *             pager with answer UI), and Test (single scrollable page with
 *             batch answer checking). Media tab only appears when the lesson has
 *             attached files. Tab choice is persisted per lesson in localStorage.
 *             Both PDF and Interactive tabs read from `exercise.content.blocks` so
 *             admin edits flow to both.
 */

'use client'

import React, { useEffect, useMemo } from 'react'
import type { Exercise, FormulaSheet, Media as MediaType } from '@/infra/types/content'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'
import { ChatInterface } from '@/ui/web/chat'
import { LessonMenu, type LessonMenuTab } from '@/ui/web/lesson-menu'
import { useTranslations } from '@/ui/web/providers/I18n'
import { BlocksDocumentLessonView } from '../BlocksDocumentLessonView'
import { ChatLessonView } from '../ChatLessonView'
import { ExercisesPager } from '../ExercisesPager'
import { MediaTabContent } from '../MediaTabContent'
import { TestViewRenderer } from '../TestViewRenderer'
import { useLessonViewMode, type LessonMode } from './useLessonViewMode'

/** Which interactive pager to render on the Interactive tab. */
type InteractiveSource =
  | {
      kind: 'blocks'
      blocks: ResolvedLessonBlock[]
      contentPageBodies?: Record<string, React.ReactNode>
      validFiles?: MediaType[]
    }
  | { kind: 'exercises'; exercises: Exercise[] }

interface DualModeLessonViewProps {
  lessonId: string
  lessonTitle: string
  backUrl: string
  courseSlug: string
  chapterSlug: string
  lessonSlug: string
  /** Grade bucket for progress storage — must be the lesson's course label, not the user's profile grade. */
  gradeLevel: string
  /** Exercises whose blocks feed both the PDF document and the Interactive pager. */
  exercises: Exercise[]
  interactive: InteractiveSource
  /** Attached media files — when present, a "Media" tab is shown as the first tab. */
  validFiles?: MediaType[]
  mediaMap?: Record<string, MediaType>
  chatLessonId?: string
  showChat?: boolean
  formulaSheet?: FormulaSheet | null
  /** Renderer modes enabled by the admin for this lesson. Defaults to all four. */
  visibleRenderers?: LessonMode[]
  initialExerciseIndex?: number
  initialMode?: LessonMode
  nextLesson?: { title?: string | null; slug?: string | null } | null
}

/**
 * Returns which tabs should be rendered, combining the admin toggle with the
 * data-presence guard for the Media tab.
 *
 * - Media: shown only when `hasMedia` AND 'media' is in `visibleRenderers`.
 * - PDF / Interactive / Test: shown when their respective value is in `visibleRenderers`.
 * - When `visibleRenderers` is undefined, all four tabs are shown (backward
 *   compatible for lessons created before this feature existed).
 */
function getVisibleTabs(
  visibleRenderers: LessonMode[] | undefined,
  hasMedia: boolean,
): { media: boolean; pdf: boolean; interactive: boolean; test: boolean; chat: boolean } {
  // 'chat' is intentionally NOT in the default allowlist: v0 renders a
  // hardcoded demo script that has nothing to do with any real lesson topic,
  // so legacy lessons (no `visibleRenderers` set) must not surface it. Admins
  // opt in per lesson by adding 'chat' to `visibleRenderers`.
  const defaultAllowed: LessonMode[] = ['media', 'pdf', 'interactive', 'test']
  const allowed = visibleRenderers ?? defaultAllowed
  return {
    media: hasMedia && allowed.includes('media'),
    pdf: allowed.includes('pdf'),
    interactive: allowed.includes('interactive'),
    test: allowed.includes('test'),
    chat: allowed.includes('chat'),
  }
}

export function DualModeLessonView(props: DualModeLessonViewProps) {
  const {
    lessonId,
    lessonTitle,
    backUrl,
    courseSlug,
    chapterSlug,
    lessonSlug,
    gradeLevel,
    exercises,
    interactive,
    validFiles = [],
    mediaMap,
    chatLessonId,
    showChat,
    formulaSheet,
    visibleRenderers,
    initialExerciseIndex,
    initialMode,
    nextLesson,
  } = props

  const t = useTranslations('courses')
  const hasMedia = validFiles.length > 0
  const visibleTabs = useMemo(
    () => getVisibleTabs(visibleRenderers, hasMedia),
    [visibleRenderers, hasMedia],
  )
  const [mode, select] = useLessonViewMode(lessonId, visibleRenderers)

  useEffect(() => {
    if (initialMode && visibleTabs[initialMode]) {
      select(initialMode)
    }
  }, [initialMode, select, visibleTabs])

  // Resolve the active tab, falling back when the stored mode is no longer allowed.
  const effectiveMode = (() => {
    if (!visibleTabs[mode]) {
      // Stored mode points to a tab the admin just disabled — pick the first available.
      if (visibleTabs.media) return 'media'
      if (visibleTabs.pdf) return 'pdf'
      if (visibleTabs.interactive) return 'interactive'
      if (visibleTabs.test) return 'test'
      return 'chat'
    }
    return mode
  })()

  // Boss's spec (see `תצוגה.HTML` concept): drop the two-row exercise chrome
  // (title + logo row and the tab bar) in favor of a floating menu button
  // that surfaces the lesson name, view-mode switcher, and back navigation.
  // Rendered once at DualModeLessonView top level so the pill floats over
  // whichever view is active — no more `headerSlot` prop drilling.
  const menuTabs: LessonMenuTab[] = [
    visibleTabs.media && { mode: 'media' as const, label: t('lessonViewModeMedia') },
    visibleTabs.pdf && { mode: 'pdf' as const, label: t('lessonViewModePdf') },
    visibleTabs.interactive && {
      mode: 'interactive' as const,
      label: t('lessonViewModeInteractive'),
    },
    visibleTabs.test && { mode: 'test' as const, label: t('lessonViewModeTest') },
    visibleTabs.chat && { mode: 'chat' as const, label: t('lessonViewModeChat') },
  ].filter((tab): tab is LessonMenuTab => tab !== false)

  const lessonMenu = (
    <LessonMenu
      lessonTitle={lessonTitle}
      tabs={menuTabs}
      activeMode={effectiveMode}
      onSelectMode={select}
      backUrl={backUrl}
    />
  )

  if (effectiveMode === 'media') {
    return (
      <section>
        <MediaTabContent
          lessonTitle={lessonTitle}
          backUrl={backUrl}
          lessonId={lessonId}
          validFiles={validFiles}
          courseSlug={courseSlug}
          headerSlot={lessonMenu}
          showChat={showChat}
          chatLessonId={chatLessonId}
          formulaSheet={formulaSheet}
        />
      </section>
    )
  }

  if (effectiveMode === 'pdf') {
    return (
      <section>
        <BlocksDocumentLessonView
          lessonTitle={lessonTitle}
          backUrl={backUrl}
          exercises={exercises}
          mediaMap={mediaMap}
          headerSlot={lessonMenu}
          chatContent={
            showChat ? (
              <ChatInterface
                lessonId={chatLessonId ?? lessonId}
                translationNamespace="courses"
                showMathTools={true}
                formulaSheet={formulaSheet}
              />
            ) : null
          }
        />
      </section>
    )
  }

  if (effectiveMode === 'chat') {
    return (
      <section>
        <ChatLessonView
          lessonTitle={lessonTitle}
          backUrl={backUrl}
          lessonId={lessonId}
          exercises={exercises}
          mediaMap={mediaMap}
          formulaSheet={formulaSheet}
          headerSlot={lessonMenu}
        />
      </section>
    )
  }

  if (interactive.kind === 'blocks') {
    return (
      <section>
        <ExercisesPager
          exercises={exercises}
          blocks={interactive.blocks}
          contentPageBodies={interactive.contentPageBodies}
          lessonTitle={lessonTitle}
          backUrl={backUrl}
          courseSlug={courseSlug}
          chapterSlug={chapterSlug}
          lessonSlug={lessonSlug}
          lessonId={lessonId}
          gradeLevel={gradeLevel}
          mediaMap={mediaMap}
          showChat={showChat}
          formulaSheet={formulaSheet}
          headerSlot={lessonMenu}
          hideLatexBlocks
          initialExerciseIndex={initialExerciseIndex}
          nextLesson={nextLesson}
        />
      </section>
    )
  }

  if (effectiveMode === 'test') {
    return (
      <section>
        <TestViewRenderer
          lessonTitle={lessonTitle}
          backUrl={backUrl}
          courseSlug={courseSlug}
          chapterSlug={chapterSlug}
          lessonSlug={lessonSlug}
          lessonId={lessonId}
          exercises={exercises}
          mediaMap={mediaMap}
          showChat={showChat}
          formulaSheet={formulaSheet}
          headerSlot={lessonMenu}
          hideLatexBlocks
          nextLesson={nextLesson}
        />
      </section>
    )
  }

  return (
    <section>
      <ExercisesPager
        exercises={interactive.exercises}
        lessonTitle={lessonTitle}
        backUrl={backUrl}
        courseSlug={courseSlug}
        chapterSlug={chapterSlug}
        lessonSlug={lessonSlug}
        lessonId={lessonId}
        gradeLevel={gradeLevel}
        mediaMap={mediaMap}
        showChat={showChat}
        formulaSheet={formulaSheet}
        headerSlot={lessonMenu}
        hideLatexBlocks
        initialExerciseIndex={initialExerciseIndex}
        nextLesson={nextLesson}
      />
    </section>
  )
}
