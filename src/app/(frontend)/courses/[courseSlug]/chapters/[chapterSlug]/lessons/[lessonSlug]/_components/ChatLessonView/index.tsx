/**
 * @fileType component
 * @domain lessons
 * @pattern chat-view
 * @ai-summary Chat-view tab for a lesson. Renders the lesson's existing
 *             exercises one at a time as chat bubbles, with the shared
 *             ExerciseRenderer handling all answer UI + correctness checks.
 *             A freeform chat input at the bottom talks to the same
 *             /api/agent/chat endpoint the Interactive tab uses, so students
 *             can ask questions with the current exercise's context already
 *             injected server-side.
 *
 *             No authored scripts, no per-lesson content collection — this
 *             is a visual reskin of the Interactive flow.
 */

'use client'

import type { Exercise, FormulaSheet, Media } from '@/infra/types/content'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { ExerciseWorkspace } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseSlug]/_components/ExerciseWorkspace'
import {
  LessonMenuProvider,
  useLessonMenuConfig,
  type LessonMenuConfig,
} from '@/ui/web/lesson-menu'
import { useTranslations } from '@/ui/web/providers/I18n'
import { ChatLessonRunnerView } from './ChatLessonRunnerView'
import { useBrowserTTS } from './useBrowserTTS'

interface ChatLessonViewProps {
  lessonTitle: string
  backUrl: string
  lessonId: string
  exercises: Exercise[]
  mediaMap?: Record<string, Media>
  formulaSheet?: FormulaSheet | null
  headerSlot?: ReactNode
}

export function ChatLessonView({
  lessonTitle,
  backUrl,
  lessonId,
  exercises,
  mediaMap,
  formulaSheet,
  headerSlot,
}: ChatLessonViewProps) {
  const t = useTranslations('courses')
  // TTS lives here so its mute state can be piped to the workspace's
  // LessonMenu via a nested LessonMenuProvider, while the runner below
  // uses the same instance for narration + cleanup on reset.
  const tts = useBrowserTTS()
  const outerMenuConfig = useLessonMenuConfig()

  const menuConfig: LessonMenuConfig | null = useMemo(() => {
    if (!outerMenuConfig) return null
    return {
      ...outerMenuConfig,
      mute: tts.supported
        ? {
            muted: tts.muted,
            onToggle: tts.toggleMuted,
            muteLabel: t('chatViewMute'),
            unmuteLabel: t('chatViewUnmute'),
          }
        : undefined,
    }
  }, [outerMenuConfig, tts.supported, tts.muted, tts.toggleMuted, t])

  const workspace = (
    <ExerciseWorkspace
      exerciseTitle={lessonTitle}
      backUrl={backUrl}
      formulaSheet={formulaSheet}
      // No `chatContent` here — ChatLessonRunnerView is embedded in
      // `primaryContent` and mounts its OWN <Notebook> once the student
      // clicks Start (see ChatLessonRunnerView.tsx). Do NOT opt the
      // workspace-level Notebook back in here or you'll double up FABs
      // in ActiveChat.
      primaryContent={
        <div className="flex h-full flex-col relative">
          {headerSlot}
          <ChatLessonRunnerView
            lessonTitle={lessonTitle}
            lessonId={lessonId}
            exercises={exercises}
            mediaMap={mediaMap}
            tts={tts}
          />
        </div>
      }
    />
  )

  return menuConfig ? (
    <LessonMenuProvider value={menuConfig}>{workspace}</LessonMenuProvider>
  ) : (
    workspace
  )
}
