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

function safeParse(raw: string | null): NotebookStroke[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as NotebookStroke[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(key: string, next: NotebookStroke[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Quota exceeded or private mode — the notebook still works in-memory
    // for the remainder of the session.
  }
}

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
 *
 * All mutators use functional `setState` updates so two rapid calls within
 * one event tick (unlikely on single-pointer canvas, defensive on multi-
 * pointer) can't overwrite each other via stale closure state.
 */
export function useNotebook(storageKey: string) {
  const key = STORAGE_PREFIX + storageKey
  const [strokes, setStrokes] = useState<NotebookStroke[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setStrokes(safeParse(localStorage.getItem(key)))
  }, [key])

  const addStroke = useCallback(
    (stroke: NotebookStroke) => {
      setStrokes((prev) => {
        const next = [...prev, stroke]
        writeStorage(key, next)
        return next
      })
    },
    [key],
  )

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev
      const next = prev.slice(0, -1)
      writeStorage(key, next)
      return next
    })
  }, [key])

  const clear = useCallback(() => {
    setStrokes([])
    writeStorage(key, [])
  }, [key])

  return { strokes, addStroke, undo, clear }
}
