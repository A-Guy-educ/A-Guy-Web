/**
 * Owns the composer's query, attached homework photo, and AI suggestion.
 * Local title-substring/index match runs on every keystroke. The model is
 * asked (debounced) when the local match finds nothing or the query reads
 * like a sentence, and immediately on send or when a photo is attached.
 *
 * @fileType hook
 * @domain frontend
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CourseTab } from '../CourseTabs'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'
import { downscaleImageForSuggest } from './courseComposerImage'
import {
  type ComposerSuggestion,
  fetchLessonSuggestion,
  looksLikeSentence,
} from './courseComposerSuggest'

const AI_DEBOUNCE_MS = 400
const MAX_RESULTS = 5

interface Options {
  nodes: LessonSearchNode[]
  courseTitle: string
  locale: 'en' | 'he'
  activeTab: CourseTab
}

export interface ComposerAttachment {
  file: File
  previewUrl: string
}

// Higher score = better match. 0 means no match.
// Title is scored above slug so a lesson whose title literally contains the
// query (e.g. "test 1" for "tes") never gets buried under a lesson that only
// matches via its English slug (e.g. "coefficient-comparison-sys-tem"). Slug
// stays in the haystack because Hebrew-titled lessons often rely on their
// English slug for cross-language search ("summ" → slug "2025-summer").
// Stem fallback requires q.length >= 4 so stems are always >= 3 chars — a
// 2-char stem (e.g. "קיץ" → "קי", "tes" → "te") matched far too much.
function scoreMatch(node: LessonSearchNode, q: string): number {
  if (String(node.displayIndex) === q) return 100
  const title = (node.lesson.title ?? '').toLowerCase()
  const slug = (node.lesson.slug ?? '').toLowerCase().replace(/[-_]+/g, ' ')
  if (title.includes(q)) return 90
  if (slug.includes(q)) return 50
  if (q.length >= 4) {
    const stem = q.slice(0, -1)
    if (title.includes(stem)) return 40
    if (slug.includes(stem)) return 20
  }
  return 0
}

export function useCourseComposerState({ nodes, courseTitle, locale, activeTab }: Options) {
  const [query, setQuery] = useState('')
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null)
  const [suggestion, setSuggestion] = useState<ComposerSuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    // Score, keep hits, sort by score desc, stable on original insertion order
    // (which is already chapter/order within each lesson type).
    const scored = nodes
      .map((node, index) => ({ node, index, score: scoreMatch(node, q) }))
      .filter((entry) => entry.score > 0)
    scored.sort((a, b) => b.score - a.score || a.index - b.index)
    return scored.slice(0, MAX_RESULTS).map((entry) => entry.node)
  }, [nodes, query])

  const resetAi = useCallback(() => {
    abortRef.current?.abort()
    setSuggestion(null)
    setAiError(false)
    setAiLoading(false)
  }, [])

  const requestSuggestion = useCallback(
    async (text: string, photo: ComposerAttachment | null) => {
      if (!text.trim() && !photo) return
      const controller = new AbortController()
      abortRef.current?.abort()
      abortRef.current = controller
      setAiLoading(true)
      setAiError(false)
      try {
        const image = photo ? await downscaleImageForSuggest(photo.file) : undefined
        const result = await fetchLessonSuggestion({
          query: text.trim(),
          locale,
          courseTitle,
          nodes,
          image,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setSuggestion(result)
      } catch (err) {
        if (controller.signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setAiError(true)
      } finally {
        if (!controller.signal.aborted) setAiLoading(false)
      }
    },
    [courseTitle, locale, nodes],
  )

  useEffect(() => {
    setSelectedIdx(0)
  }, [query, filtered.length])

  // Clear AI state when the composer is emptied.
  useEffect(() => {
    if (!query.trim() && !attachment) resetAi()
  }, [query, attachment, resetAi])

  // A new tab is a new context: a stale suggestion would be misleading.
  useEffect(() => {
    setQuery('')
    resetAi()
  }, [activeTab, resetAi])

  // Debounced text suggestion. With a photo attached the student sends
  // explicitly, so typing a caption doesn't re-upload the image per keystroke.
  useEffect(() => {
    const q = query.trim()
    if (!q || attachment || nodes.length === 0) return
    if (filtered.length > 0 && !looksLikeSentence(q)) return
    const timer = setTimeout(() => void requestSuggestion(q, null), AI_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, attachment, filtered.length, nodes.length, requestSuggestion])

  const attachPhoto = useCallback(
    (file: File) => {
      setAttachment((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl)
        return { file, previewUrl: URL.createObjectURL(file) }
      })
      void requestSuggestion(query, { file, previewUrl: '' })
    },
    [query, requestSuggestion],
  )

  const removePhoto = useCallback(() => {
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    resetAi()
  }, [resetAi])

  return {
    query,
    setQuery,
    filtered,
    attachment,
    attachPhoto,
    removePhoto,
    suggestion,
    aiLoading,
    aiError,
    send: () => requestSuggestion(query, attachment),
    selectedIdx,
    setSelectedIdx,
  }
}
