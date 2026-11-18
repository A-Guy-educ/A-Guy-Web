'use client'

import type { ReactNode } from 'react'

import { LessonMenu } from './LessonMenu'
import { useLessonMenuConfig } from './LessonMenuContext'

/**
 * The lesson menu + back pills in normal flow, wired to the surrounding
 * `LessonMenuProvider` exactly like the floating copy in `ExerciseWorkspace`.
 * Pair with `ExerciseWorkspace menuPlacement="inline"` so only one renders.
 */
export function InlineLessonMenu({
  lessonTitle,
  backUrl,
}: {
  lessonTitle: string
  backUrl?: string
}) {
  const config = useLessonMenuConfig()
  return (
    <LessonMenu
      placement="inline"
      lessonTitle={lessonTitle}
      backUrl={backUrl}
      tabs={config?.tabs}
      activeMode={config?.activeMode}
      onSelectMode={config?.onSelectMode}
      mute={config?.mute}
      restart={config?.restart}
      hideBack={config?.hideBack}
    />
  )
}

/** Slim top bar over a lesson view's material (desktop). */
export function LessonViewerBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-content-gap-xs border-b border-border bg-card px-3">
      {children}
    </div>
  )
}
