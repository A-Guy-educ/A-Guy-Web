/**
 * Active Time Provider
 *
 * Client-side provider that wraps the app to track active time.
 * Also owns the current lesson *visit* (one per lesson mount) for per-visit
 * dwell tracking, and flags the visit when the user scrolls its PDF.
 */

'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import {
  heartbeatBody,
  MEDIA_PDF_SCROLL_EVENT,
  mintVisitId,
  postHeartbeat,
  type LessonVisit,
  type LessonVisitInfo,
} from '@/client/hooks/lesson-visit-heartbeat'
import { useActiveTimeTracker } from '@/client/hooks/useActiveTimeTracker'

interface ActiveTimeContextValue {
  setCurrentLesson: (lesson: LessonVisitInfo | null) => void
  currentLessonId: string | null
}

const ActiveTimeContext = createContext<ActiveTimeContextValue>({
  setCurrentLesson: () => {},
  currentLessonId: null,
})

/**
 * Register the mounted lesson. Keyed on lessonId only — courseId and
 * contentType derive from the same route params, so a parent re-render
 * must not split one visit into two.
 */
export function useSetCurrentLesson(lesson: LessonVisitInfo) {
  const { setCurrentLesson } = useContext(ActiveTimeContext)
  const lessonRef = useRef(lesson)
  lessonRef.current = lesson

  useEffect(() => {
    setCurrentLesson(lessonRef.current)
    return () => setCurrentLesson(null)
  }, [lesson.lessonId, setCurrentLesson])
}

function usePdfScrollPing(visit: LessonVisit | null) {
  const visitRef = useRef(visit)
  visitRef.current = visit
  const flaggedVisitRef = useRef<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const current = visitRef.current
      if (!current || flaggedVisitRef.current === current.visitId) return
      flaggedVisitRef.current = current.visitId
      postHeartbeat(heartbeatBody(0, current, true)).catch(() => {})
    }
    window.addEventListener(MEDIA_PDF_SCROLL_EVENT, onScroll)
    return () => window.removeEventListener(MEDIA_PDF_SCROLL_EVENT, onScroll)
  }, [])
}

interface ActiveTimeProviderProps {
  children: React.ReactNode
}

export function ActiveTimeProvider({ children }: ActiveTimeProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [visit, setVisit] = useState<LessonVisit | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setIsAuthenticated(!!data.user)
        }
      } catch {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  useActiveTimeTracker({
    isAuthenticated,
    enabled: isAuthenticated,
    visit,
  })
  usePdfScrollPing(isAuthenticated ? visit : null)

  const setCurrentLesson = useCallback((lesson: LessonVisitInfo | null) => {
    setVisit(lesson ? { ...lesson, visitId: mintVisitId() } : null)
  }, [])

  return (
    <ActiveTimeContext.Provider
      value={{ setCurrentLesson, currentLessonId: visit?.lessonId ?? null }}
    >
      {children}
    </ActiveTimeContext.Provider>
  )
}
