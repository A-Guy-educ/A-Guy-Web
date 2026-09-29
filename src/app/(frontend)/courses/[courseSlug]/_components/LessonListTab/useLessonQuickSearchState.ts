/**
 * @fileType hook
 * @domain frontend
 * @pattern lesson-quick-search-state
 * @ai-summary Owns open/query/selection state and side effects (Esc / outside-click) for LessonQuickSearch, plus the filtered-nodes derivation across all lesson types.
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LessonSearchNode } from './lessonRoadmapTypes'

interface Options {
  nodes: LessonSearchNode[]
}

export function useLessonQuickSearchState({ nodes }: Options) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return nodes.slice(0, 5)
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
