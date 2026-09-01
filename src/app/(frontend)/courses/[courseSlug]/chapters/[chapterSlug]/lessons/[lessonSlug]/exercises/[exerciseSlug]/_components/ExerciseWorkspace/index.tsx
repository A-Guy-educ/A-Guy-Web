'use client'

import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import type { FormulaSheet } from '@/infra/types/content'
import { type MobileExerciseViewMode, SplitPaneLayout } from '@/ui/web/components/split-pane-layout'
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
  backUrl?: string
  primaryContent: React.ReactNode
  chatContent?: React.ReactNode
  // Accepted for API compatibility with existing callers. The mobile "Help"
  // panel that consumed these was removed — hint/guiding/formula/notes are
  // now surfaced through the exercise renderer's own controls.
  formulaSheet?: FormulaSheet | null
  customNotes?: string
  onNotesChange?: (notes: string) => void
}

export function ExerciseWorkspace({
  exerciseTitle,
  backUrl: _backUrl,
  primaryContent,
  chatContent,
}: ExerciseWorkspaceProps) {
  const [mobileMode, setMobileMode] = useState<MobileExerciseViewMode>('exercise')

  const handleMobileModeChange = useCallback((mode: MobileExerciseViewMode) => {
    setMobileMode(mode)
  }, [])

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col overflow-hidden">
      {/* Site header / logo row and the old tab bar are gone — the
          floating LessonMenu (mounted by DualModeLessonView) surfaces
          lesson title + view-mode switcher + back navigation instead.
          Mobile fullscreen mode was removed with the header — the only
          entry point (Maximize2 in ExerciseHeader) went away with it. */}

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

      {/* Drawing notebook — same canvas as the Ask page; check-solution
          dispatches `ask-action` which ChatInterface handles by uploading
          the drawing and asking the tutor to compare it against the
          question. */}
      <Notebook contextTitle={exerciseTitle} />
    </div>
  )
}
