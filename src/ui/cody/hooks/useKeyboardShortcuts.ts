/**
 * @fileType hook
 * @domain cody
 * @pattern keyboard-shortcuts
 * @ai-summary Hook for keyboard navigation shortcuts in Cody dashboard
 */
'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcutHandlers {
  onNavigateDown?: () => void
  onNavigateUp?: () => void
  onOpenSelected?: () => void
  onCloseDetail?: () => void
  onRefresh?: () => void
  onNewTask?: () => void
  onEdit?: () => void
  onOpenPreview?: () => void
  onFocusSearch?: () => void
  onShowHelp?: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      // Skip if modifier keys are pressed (except for potential future shortcuts)
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      switch (event.key) {
        case 'j':
          handlers.onNavigateDown?.()
          break
        case 'k':
          handlers.onNavigateUp?.()
          break
        case 'Enter':
          event.preventDefault()
          handlers.onOpenSelected?.()
          break
        case 'Escape':
          handlers.onCloseDetail?.()
          break
        case 'r':
          // Only trigger refresh if not in an input
          handlers.onRefresh?.()
          break
        case 'n':
          handlers.onNewTask?.()
          break
        case 'e':
          handlers.onEdit?.()
          break
        case 'p':
          handlers.onOpenPreview?.()
          break
        case '/':
          event.preventDefault()
          handlers.onFocusSearch?.()
          break
        case '?':
          handlers.onShowHelp?.()
          break
      }
    },
    [handlers],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
