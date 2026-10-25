/**
 * @fileType hook
 * @domain billing
 * @pattern tier-gate-data
 * @ai-summary Fetches the current user's opened-lesson ids per lesson type (the free-tier counter) for one gradeLevel, so lesson lists can render tier-locked rows. No-op when the tier kill switch is off.
 *
 * Gotcha: `gradeLevel` must be the content's grade bucket (`course.courseLabel`) — the same key the lesson page writes progress under.
 */

'use client'

import { useEffect, useState } from 'react'
import { EMPTY_OPENED_LESSONS, isTierContentLocksEnabled, type OpenedLessonIds } from '@/lib/tiers'

export function useOpenedLessons(gradeLevel: string | null | undefined): OpenedLessonIds {
  const [opened, setOpened] = useState<OpenedLessonIds>(EMPTY_OPENED_LESSONS)

  useEffect(() => {
    if (!isTierContentLocksEnabled() || !gradeLevel) return

    const controller = new AbortController()
    fetch(`/api/tiers/opened-lessons?gradeLevel=${encodeURIComponent(gradeLevel)}`, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: OpenedLessonIds } | null) => {
        if (json?.data) setOpened(json.data)
      })
      .catch(() => {
        /* silent — request aborted or network error; rows stay unlocked */
      })

    return () => controller.abort()
  }, [gradeLevel])

  return opened
}
