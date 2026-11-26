'use client'

import { isRTL } from '@/i18n/config'
import type { FormulaSheet } from '@/infra/types/content'
import { type MobileExerciseViewMode, SplitPaneLayout } from '@/ui/web/components/split-pane-layout'
import { LessonMenu, useLessonMenuConfig } from '@/ui/web/lesson-menu'
import { ChatToolsColumn, useChatTools, type ChatToolsOptions } from '@/ui/web/chat-tools'
import { useMediaQuery } from '@/client/hooks/useMediaQuery'
import React, { useCallback, useState } from 'react'
import { useLocale } from '@/ui/web/providers/I18n'
import { MobileChatPanel } from './MobileChatPanel'

interface ExerciseWorkspaceProps {
  exerciseTitle: string
  /** Human-readable label for the floating LessonMenu pill (falls back to `exerciseTitle`). */
  lessonTitle?: string
  /** URL used by the LessonMenu back button when the browser has no history to pop. */
  backUrl?: string
  primaryContent: React.ReactNode
  chatContent?: React.ReactNode
  /**
   * Which back-button semantics the floating menu should use.
   * - `'lesson'` — this workspace shell IS a lesson surface (label = "back to
   *   course", pushes straight to `backUrl`). Callers like LessonIntroPage that
   *   render lesson chrome without a tab picker should set this.
   * - `'standalone'` (default) — treat the menu as generic (label = "back",
   *   uses browser history). Used by /ask and other one-off surfaces.
   *
   * Left unset, LessonMenu also infers `'lesson'` when tabs are published via
   * LessonMenuProvider (DualModeLessonView), so DualModeLessonView doesn't need
   * to pass this prop.
   */
  menuVariant?: 'lesson' | 'standalone'
  /**
   * `'inline'`: on desktop the caller renders the lesson menu in its own top
   * bar (`InlineLessonMenu`), so the floating pills are skipped there.
   */
  menuPlacement?: 'floating' | 'inline'
  /**
   * Desktop: wrap the chat in a column with a tool rail (formula sheet,
   * calculator, material miniature…) that can collapse to a vertical strip.
   * Mobile offers the same tools from the chat's "+" menu.
   */
  chatTools?: ChatToolsOptions
  // Accepted for API compatibility with existing callers. The mobile "Help"
  // panel that consumed these was removed — hint/guiding/formula/notes are
  // now surfaced through the exercise renderer's own controls.
  formulaSheet?: FormulaSheet | null
  customNotes?: string
  onNotesChange?: (notes: string) => void
}

export function ExerciseWorkspace({
  exerciseTitle,
  lessonTitle,
  backUrl,
  primaryContent,
  chatContent,
  menuVariant,
  menuPlacement = 'floating',
  chatTools,
}: ExerciseWorkspaceProps) {
  const [mobileMode, setMobileMode] = useState<MobileExerciseViewMode>('exercise')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')
  const chatToolsState = useChatTools()
  const useToolColumn = Boolean(chatTools) && isDesktop && React.isValidElement(chatContent)

  const handleMobileModeChange = useCallback((mode: MobileExerciseViewMode) => {
    setMobileMode(mode)
  }, [])

  // View-mode config (tabs / active / onSelect) is provided by
  // DualModeLessonView via `LessonMenuProvider`. When there's no provider
  // (Ask page mounts ExerciseWorkspace directly), the menu falls back to
  // its back-only variant — so students on `/ask` still get a way out of
  // the fixed-inset workspace overlay.
  const menuConfig = useLessonMenuConfig()

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col overflow-hidden">
      {!(menuPlacement === 'inline' && isDesktop) && (
        <LessonMenu
          lessonTitle={lessonTitle ?? exerciseTitle}
          tabs={menuConfig?.tabs}
          activeMode={menuConfig?.activeMode}
          onSelectMode={menuConfig?.onSelectMode}
          backUrl={backUrl}
          mute={menuConfig?.mute}
          restart={menuConfig?.restart}
          hideBack={menuConfig?.hideBack}
          variant={menuVariant}
        />
      )}

      <SplitPaneLayout
        primaryContent={primaryContent}
        chatCollapsed={useToolColumn && chatToolsState.collapsed}
        chatContent={
          useToolColumn && chatTools ? (
            <ChatToolsColumn options={chatTools} state={chatToolsState} rtl={rtl}>
              {chatContent}
            </ChatToolsColumn>
          ) : chatContent && React.isValidElement(chatContent) ? (
            <MobileChatPanel
              chatContent={chatContent}
              onBackToExercise={() => handleMobileModeChange('exercise')}
              chatTools={chatTools}
              chatToolsState={chatToolsState}
            />
          ) : (
            chatContent
          )
        }
        storageKey="exercise-split-size"
        className="flex-1"
        mobileMode={mobileMode}
        onMobileModeChange={handleMobileModeChange}
      />

      {/* Global floating notebook FAB is gone — notebooks are now
          attached per question block via `QuestionCard.notebookContextTitle`
          so each question has its own toggle + inline canvas, matching
          the Ask page's `AskExerciseCard` pattern. */}
    </div>
  )
}
