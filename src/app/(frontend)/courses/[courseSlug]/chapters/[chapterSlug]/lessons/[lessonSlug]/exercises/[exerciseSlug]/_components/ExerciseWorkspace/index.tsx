'use client'

import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import type { FormulaSheet } from '@/infra/types/content'
import { type MobileExerciseViewMode, SplitPaneLayout } from '@/ui/web/components/split-pane-layout'
import { LessonMenu, useLessonMenuConfig } from '@/ui/web/lesson-menu'
import { Notebook } from '@/ui/web/notebook'
import { X } from 'lucide-react'
import React, { useCallback, useState, type ReactElement } from 'react'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'

interface MobileChatPanelProps {
  chatContent: ReactElement
  displayMode?: 'full' | 'input-only'
  isMobile?: boolean
  viewMode?: 'PDF' | 'Chat'
  onModeToggle?: () => void
  onChatInteraction?: () => void
  onBackToExercise: () => void
}

function MobileChatPanel({
  chatContent,
  displayMode,
  isMobile,
  viewMode,
  onModeToggle,
  onChatInteraction,
  onBackToExercise,
}: MobileChatPanelProps) {
  const t = useTranslations('courses')
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')

  return (
    <div className="relative h-full flex flex-col">
      <button
        type="button"
        onClick={onBackToExercise}
        aria-label={t('backToExercise')}
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
        className={cn(
          'lg:hidden absolute z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-elevation-2 backdrop-blur transition-colors duration-normal hover:bg-muted',
          rtl ? 'left-3' : 'right-3',
        )}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex-1 min-h-0 pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0">
        {React.cloneElement(
          chatContent as React.ReactElement<{
            displayMode?: 'full' | 'input-only'
            isMobile?: boolean
            viewMode?: 'PDF' | 'Chat'
            onModeToggle?: () => void
            onChatInteraction?: () => void
          }>,
          {
            displayMode,
            isMobile,
            viewMode,
            onModeToggle,
            onChatInteraction,
          },
        )}
      </div>
    </div>
  )
}

interface ExerciseWorkspaceProps {
  exerciseTitle: string
  /** Human-readable label for the floating LessonMenu pill (falls back to `exerciseTitle`). */
  lessonTitle?: string
  /** URL used by the LessonMenu back button when the browser has no history to pop. */
  backUrl?: string
  primaryContent: React.ReactNode
  chatContent?: React.ReactNode
  /**
   * Explicit opt-in for the drawing notebook when a chat listener lives
   * elsewhere on the page (e.g. `ChatLessonView` embeds its own listener
   * inside `primaryContent`, not as `chatContent`). Defaults to
   * `Boolean(chatContent)`, which covers every other caller.
   */
  hasChatListener?: boolean
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
  hasChatListener,
}: ExerciseWorkspaceProps) {
  const [mobileMode, setMobileMode] = useState<MobileExerciseViewMode>('exercise')

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
      <LessonMenu
        lessonTitle={lessonTitle ?? exerciseTitle}
        tabs={menuConfig?.tabs}
        activeMode={menuConfig?.activeMode}
        onSelectMode={menuConfig?.onSelectMode}
        backUrl={backUrl}
      />

      <SplitPaneLayout
        primaryContent={primaryContent}
        chatContent={
          chatContent && React.isValidElement(chatContent) ? (
            <MobileChatPanel
              chatContent={chatContent}
              onBackToExercise={() => handleMobileModeChange('exercise')}
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

      {/* Drawing notebook — mounted only when a chat surface is on the
          page to hear the `ask-action` event. Defaults to the presence
          of `chatContent`; `ChatLessonView` embeds its listener inside
          `primaryContent` instead, so it opts in explicitly via
          `hasChatListener`. Empty-lesson placeholder paths pass neither,
          so the drawing button (which nobody would hear) stays hidden. */}
      {(hasChatListener ?? Boolean(chatContent)) && <Notebook contextTitle={exerciseTitle} />}
    </div>
  )
}
