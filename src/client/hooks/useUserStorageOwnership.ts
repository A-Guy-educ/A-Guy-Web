/**
 * @fileType hook
 * @domain auth
 * @pattern shared-device
 * @ai-summary On every signed-in page load, claims this browser's user-scoped storage for the current user (wiping a previous student's data on shared school computers) and reconciles the local course selection with `users.currentCourse`, with the server winning.
 *
 * Gotcha: a wipe reloads the page — components that already read the previous student's storage on mount cannot be reset any other way.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { applyServerCourseSelection, getUserProfile } from '@/client/state/localStorage/userProfile'
import { claimUserStorage } from '@/client/state/localStorage/userScopedStorage'
import { syncCurrentCourse } from '@/infra/analytics/utils/currentCourseSync'
import type { User } from '@/infra/types/content'

export function useUserStorageOwnership(user: User | null, isLoading: boolean): void {
  const router = useRouter()
  const userId = user?.id ?? null
  const serverCourseId = user?.courseSelection?.courseId ?? null

  useEffect(() => {
    if (isLoading || !user) return

    const claim = claimUserStorage({ userId: user.id, isClassMember: Boolean(user.isClassMember) })
    const courseChanged = user.courseSelection
      ? applyServerCourseSelection(user.courseSelection)
      : false

    if (claim === 'wiped') {
      window.location.reload()
      return
    }

    if (!user.courseSelection) {
      // Server has no course yet: the local pick (now known to be this
      // user's) becomes the server record.
      const localCourseId = getUserProfile()?.courseId
      if (localCourseId) syncCurrentCourse(localCourseId)
      return
    }

    // Course came from another device / a lesson opened elsewhere —
    // re-render server components with the new cookies.
    if (courseChanged) router.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per user / server course, not per refetched object
  }, [userId, serverCourseId, isLoading])
}
