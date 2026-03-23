'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { SplitPaneLayout } from '@/ui/web/components/split-pane-layout'
import { usePathname } from 'next/navigation'
import React from 'react'
import { ExerciseHeader } from '../ExerciseHeader'

interface ExerciseWorkspaceProps {
  exerciseTitle: string
  backUrl?: string
  primaryContent: React.ReactNode
  chatContent: React.ReactNode
  /** Title of the formula sheet */
  formulaSheetTitle?: string | null
  /** Pre-rendered formula sheet content */
  formulaSheetContent?: React.ReactNode | null
}

export function ExerciseWorkspace({
  exerciseTitle,
  backUrl,
  primaryContent,
  chatContent,
  formulaSheetTitle,
  formulaSheetContent,
}: ExerciseWorkspaceProps) {
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const pathname = usePathname()

  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent('open-mobile-menu'))
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
      <ExerciseHeader
        exerciseTitle={exerciseTitle}
        backUrl={backUrl}
        onMenuClick={handleMenuClick}
        user={user}
        isAuthLoading={isAuthLoading}
        currentUrl={pathname}
        formulaSheetTitle={formulaSheetTitle}
        formulaSheetContent={formulaSheetContent}
      />
      <SplitPaneLayout
        primaryContent={primaryContent}
        chatContent={chatContent}
        storageKey="exercise-split-size"
        className="flex-1"
      />
    </div>
  )
}
