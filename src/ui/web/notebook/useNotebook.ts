'use client'

import { useCallback, useEffect, useState } from 'react'

export interface NotebookPoint {
  x: number
  y: number
}

export interface NotebookStroke {
  color: string
  size: number
  points: NotebookPoint[]
}

const STORAGE_PREFIX = 'a-guy:notebook:'

/**
 * Per-scope handwritten-notebook state, backed by `localStorage`.
 *
 * WHY client-side: this is the demo phase for the notebook feature — notes
 * are internal-only, never submitted. Persisting locally keeps the surface
 * simple (no DB migration, no privacy paperwork) while the boss decides
 * whether notes should later travel with the user across devices.
 *
 * The stroke array shape is intentionally future-proof: once notes become
 * an answer artifact we can serialize the same array to the server without
 * touching the drawing component.
 */
export function useNotebook(storageKey: string) {
  const key = STORAGE_PREFIX + storageKey
  const [strokes, setStrokes] = useState<NotebookStroke[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(key)
      if (!saved) return
      const parsed = JSON.parse(saved) as NotebookStroke[]
      if (Array.isArray(parsed)) setStrokes(parsed)
    } catch {
      // Corrupted or unavailable — start fresh.
    }
  }, [key])

  const persist = useCallback(
    (next: NotebookStroke[]) => {
      setStrokes(next)
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Quota / private mode — still works in-memory this session.
      }
    },
    [key],
  )

  const addStroke = useCallback(
    (stroke: NotebookStroke) => persist([...strokes, stroke]),
    [strokes, persist],
  )
  const undo = useCallback(() => {
    if (strokes.length === 0) return
    persist(strokes.slice(0, -1))
  }, [strokes, persist])
  const clear = useCallback(() => persist([]), [persist])

  return { strokes, addStroke, undo, clear }
}
