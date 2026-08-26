'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import type { FormulaSheet } from '@/infra/types/content'
import { type MobileExerciseViewMode, SplitPaneLayout } from '@/ui/web/components/split-pane-layout'
import { Minimize2, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import React, { useCallback, useState, type ReactElement } from 'react'
import { ExerciseHeader } from '../ExerciseHeader'
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
  backUrl,
  primaryContent,
  chatContent,
}: ExerciseWorkspaceProps) {
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const pathname = usePathname()
  const [mobileMode, setMobileMode] = useState<MobileExerciseViewMode>('exercise')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent('open-mobile-menu'))
  }

  const handleMobileModeChange = useCallback((mode: MobileExerciseViewMode) => {
    setMobileMode(mode)
  }, [])

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((value) => !value)
  }, [])

  return (
    <div
      className={cn(
        'fixed inset-0 bg-background z-[200] flex flex-col overflow-hidden',
        isFullscreen && 'bg-background',
      )}
      data-exercise-fullscreen={isFullscreen}
    >
      {!isFullscreen && (
        <div className={cn(mobileMode === 'chat' && 'hidden lg:block')}>
          <ExerciseHeader
            exerciseTitle={exerciseTitle}
            backUrl={backUrl}
            onMenuClick={handleMenuClick}
            user={user}
            isAuthLoading={isAuthLoading}
            currentUrl={pathname}
            onFullscreenToggle={handleFullscreenToggle}
          />
        </div>
      )}

      {isFullscreen && (
        <button
          type="button"
          onClick={handleFullscreenToggle}
          className="fixed top-4 right-4 z-[120] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-dropdown backdrop-blur transition-colors duration-normal hover:bg-muted lg:hidden"
          aria-label="Collapse exercise view"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

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
        isFullscreen={isFullscreen}
      />
    </div>
  )
}
