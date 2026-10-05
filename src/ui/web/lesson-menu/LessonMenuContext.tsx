'use client'

import type { LessonMode } from '@/infra/types/lesson-view'
import { createContext, useContext, type ReactNode } from 'react'
import type { LessonMenuTab } from './LessonMenu'

/**
 * Optional view-mode configuration for the floating `LessonMenu`.
 *
 * WHY a context rather than props: `LessonMenu` is mounted deep inside
 * `ExerciseWorkspace`, but the view-mode state lives at the top of
 * `DualModeLessonView`. Threading `tabs` / `activeMode` / `onSelectMode`
 * through every intermediate view component (`ExercisesPager`,
 * `BlocksDocumentLessonView`, `MediaTabContent`, etc.) forces every
 * intermediate to know about a concept it doesn't otherwise care about.
 * The Ask page mounts `ExerciseWorkspace` directly with no view modes at
 * all — a context lets that path silently fall back to a back-only menu.
 */
/**
 * Optional TTS mute toggle rendered inside the LessonMenu dropdown.
 * Provided by view modes that expose narration (chat view). Callers
 * pass `null` (or omit) when the mode doesn't do TTS.
 */
export interface LessonMenuMute {
  muted: boolean
  onToggle: () => void
  muteLabel: string
  unmuteLabel: string
}

/**
 * Optional "restart this view" action rendered inside the LessonMenu
 * dropdown. The chat view uses this to let the student wipe the current
 * chat run from the menu (freeing the top-level floating slot for a
 * back-to-course arrow).
 */
export interface LessonMenuRestart {
  onReset: () => void
  label: string
}

export interface LessonMenuConfig {
  tabs: LessonMenuTab[]
  activeMode: LessonMode
  onSelectMode: (mode: LessonMode) => void
  /** Optional mute toggle surfaced inside the dropdown. */
  mute?: LessonMenuMute
  /** Optional restart action surfaced inside the dropdown. */
  restart?: LessonMenuRestart
  /**
   * Hide the dropdown's back entry. Set when the view surfaces its own
   * top-level back control (chat view) so the student doesn't see two
   * back affordances for the same destination.
   */
  hideBack?: boolean
}

const LessonMenuContext = createContext<LessonMenuConfig | null>(null)

export function LessonMenuProvider({
  value,
  children,
}: {
  value: LessonMenuConfig
  children: ReactNode
}) {
  return <LessonMenuContext.Provider value={value}>{children}</LessonMenuContext.Provider>
}

/**
 * Returns the surrounding `LessonMenuConfig`, or `null` when no provider is
 * mounted (e.g. the Ask page). Callers use the null to render the back-only
 * variant of `LessonMenu`.
 */
export function useLessonMenuConfig(): LessonMenuConfig | null {
  return useContext(LessonMenuContext)
}
