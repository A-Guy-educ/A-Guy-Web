/**
 * @fileType hook
 * @domain frontend
 * @pattern lesson-quick-search-state
 * @ai-summary Owns open/query/selection state and side effects (Cmd+K / Esc / outside-click) for LessonQuickSearch, plus the filtered-nodes derivation.
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LessonRoadmapNode } from './lessonRoadmapTypes'

interface Options {
  nodes: LessonRoadmapNode[]
}

export function useLessonQuickSearchState({ nodes }: Options) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const idx = Math.max(
        0,
        nodes.findIndex((n) => n.isFeatured),
      )
      return nodes.slice(idx, idx + 5)
    }
    return nodes.filter((n) => {
      const title = (n.lesson.title ?? '').toLowerCase()
      return title.includes(q) || String(n.displayIndex) === q
    })
  }, [nodes, query])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    // Cmd/Ctrl+K is intentionally not bound here — the site-wide CourseSearch
    // already owns it, and adding a second handler would toggle both overlays
    // on a single keystroke (verified in review of PR #1225).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return { open, setOpen, query, setQuery, selectedIdx, setSelectedIdx, filtered, rootRef }
}
