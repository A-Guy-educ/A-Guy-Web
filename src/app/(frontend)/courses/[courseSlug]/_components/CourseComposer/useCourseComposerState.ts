/**
 * Owns the composer's query, debounced AI-suggestion fetch, and derived
 * search/AI-fallback flags. Local title-substring/index match runs on every
 * keystroke; the Gemini fallback only fires when the debounced query has
 * zero local matches, so most typing produces no network traffic.
 *
 * @fileType hook
 * @domain frontend
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CourseTab } from '../CourseTabs'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'
import type { LessonSuggestInputLesson } from '@/server/services/lesson-suggest/generateLessonSuggestion'

const AI_DEBOUNCE_MS = 400
const MAX_RESULTS = 5

interface Options {
  nodes: LessonSearchNode[]
  courseTitle: string
  lessonsForSuggest: LessonSuggestInputLesson[]
  locale: 'en' | 'he'
  activeTab: CourseTab
}

interface CourseComposerState {
  query: string
  setQuery: (value: string) => void
  filtered: LessonSearchNode[]
  aiMessage: string | null
  aiLoading: boolean
  aiError: string | null
  selectedIdx: number
  setSelectedIdx: (updater: number | ((prev: number) => number)) => void
  clear: () => void
}

function matchesQuery(node: LessonSearchNode, q: string): boolean {
  const title = (node.lesson.title ?? '').toLowerCase()
  if (String(node.displayIndex) === q) return true
  if (title.includes(q)) return true
  // Hebrew inflection tolerance: "חפיפה" should match "חפיפת משולשים".
  // Retry with the last character stripped when the query is 3+ chars so
  // typing a base form still hits construct-state / gender-inflected titles.
  if (q.length >= 3 && title.includes(q.slice(0, -1))) return true
  return false
}

export function useCourseComposerState({
  nodes,
  courseTitle,
  lessonsForSuggest,
  locale,
  activeTab,
}: Options): CourseComposerState {
  const [query, setQuery] = useState('')
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return nodes.filter((n) => matchesQuery(n, q)).slice(0, MAX_RESULTS)
  }, [nodes, query])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query, filtered.length])

  // Clear AI state when the user empties the composer.
  useEffect(() => {
    if (!query.trim()) {
      setAiMessage(null)
      setAiError(null)
      abortRef.current?.abort()
    }
  }, [query])

  // Reset AI state when the active tab changes — a new context, so a stale
  // suggestion from a different tab would be misleading.
  useEffect(() => {
    setAiMessage(null)
    setAiError(null)
    setQuery('')
    abortRef.current?.abort()
  }, [activeTab])

  // Debounced AI fallback: only when local search returns nothing.
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    if (filtered.length > 0) return
    if (lessonsForSuggest.length === 0) return

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    const timer = setTimeout(() => {
      setAiLoading(true)
      setAiError(null)

      fetch('/api/agent/lesson-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: q,
          locale,
          courseTitle,
          lessons: lessonsForSuggest.slice(0, 100),
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = (await res.json()) as { message?: string }
          if (controller.signal.aborted) return
          setAiMessage(data.message?.trim() ?? null)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          if (err instanceof Error && err.name === 'AbortError') return
          setAiError('suggestError')
        })
        .finally(() => {
          if (!controller.signal.aborted) setAiLoading(false)
        })
    }, AI_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, filtered.length, locale, courseTitle, lessonsForSuggest])

  const clear = () => {
    setQuery('')
    setAiMessage(null)
    setAiError(null)
  }

  return {
    query,
    setQuery,
    filtered,
    aiMessage,
    aiLoading,
    aiError,
    selectedIdx,
    setSelectedIdx,
    clear,
  }
}
