/**
 * Active Time Tracker Hook
 *
 * Tracks user active time with heartbeat mechanism.
 * Pauses when user switches to a different browser tab.
 * Sends the current lesson visit (lessonId + visitId) for per-visit dwell.
 * The interval restarts on every new visit so the first 30s credit is
 * 30s actually spent on that lesson, not a tick inherited from the page
 * before it — Product Health's ≥60s Active threshold depends on that.
 *
 * @fileType hook
 * @domain analytics
 * @pattern heartbeat
 * @ai-summary Sends a heartbeat every 30 seconds while the tab is visible. Time spent in hidden tabs does NOT count — the streak can only advance when the user is actively looking at the page.
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'

import { heartbeatBody, postHeartbeat, type LessonVisit } from './lesson-visit-heartbeat'

const HEARTBEAT_INTERVAL_MS = 30000 // 30 seconds
const STREAK_THRESHOLD_MS = 60000 // 1 minute

interface UseActiveTimeTrackerOptions {
  isAuthenticated: boolean
  enabled?: boolean
  visit?: LessonVisit | null
}

export function useActiveTimeTracker({
  isAuthenticated,
  enabled = true,
  visit = null,
}: UseActiveTimeTrackerOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cumulativeTimeRef = useRef<number>(0)
  const streakSentRef = useRef<boolean>(false)
  const isVisibleRef = useRef<boolean>(true)

  const sendHeartbeat = useCallback(
    async (seconds: number) => {
      try {
        await postHeartbeat(heartbeatBody(seconds, visit))
      } catch (error) {
        console.error('Failed to send heartbeat:', error)
      }
    },
    [visit],
  )

  const sendStreakUpdate = useCallback(async () => {
    if (streakSentRef.current) return // Already sent today

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      await fetch(`/api/stats/streak?timeZone=${encodeURIComponent(timeZone)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      streakSentRef.current = true
    } catch (error) {
      console.error('Failed to send streak update:', error)
    }
  }, [])

  const handleVisibilityChange = useCallback(() => {
    isVisibleRef.current = document.visibilityState === 'visible'
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      return
    }

    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange)
    isVisibleRef.current = document.visibilityState === 'visible'

    // Open the visit right away so bounces shorter than one heartbeat still
    // register as a visit (zero-second ping, dwell log only).
    if (visit) sendHeartbeat(0)

    // Start the heartbeat interval
    intervalRef.current = setInterval(() => {
      if (!isVisibleRef.current) {
        // Tab is hidden, don't send heartbeat
        return
      }

      // Send heartbeat every 30 seconds
      sendHeartbeat(30)

      // Track cumulative time for streak
      cumulativeTimeRef.current += HEARTBEAT_INTERVAL_MS

      // Check if we've reached the 1-minute threshold for streak
      if (cumulativeTimeRef.current >= STREAK_THRESHOLD_MS) {
        sendStreakUpdate()
        cumulativeTimeRef.current = 0 // Reset after sending streak
      }
    }, HEARTBEAT_INTERVAL_MS)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, enabled, visit, sendHeartbeat, sendStreakUpdate, handleVisibilityChange])

  // Reset streak sent flag at midnight (local time)
  useEffect(() => {
    const now = new Date()
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).getTime() -
      now.getTime()

    const timeout = setTimeout(() => {
      streakSentRef.current = false
      cumulativeTimeRef.current = 0
    }, msUntilMidnight)

    return () => clearTimeout(timeout)
  }, [])
}
