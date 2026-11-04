/**
 * @fileType hook
 * @domain auth
 * @pattern shared-device
 * @ai-summary On every signed-in page load, claims this browser's user-scoped storage for the current user (wiping a previous student's data on shared school computers) and reconciles the local course selection with `users.currentCourse`, with the server winning.
 *
 * Gotcha: a wipe reloads the page — components that already read the previous student's storage on mount cannot be reset any other way.
 * Gotcha: one browser = one login cookie. Tabs still showing a previous account reload when another tab switches user, or they would keep writing the old student's data onto the new one.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { applyServerCourseSelection, getUserProfile } from '@/client/state/localStorage/userProfile'
import {
  claimUserStorage,
  readStorageOwner,
  subscribeToOwnerChanges,
} from '@/client/state/localStorage/userScopedStorage'
import { syncCurrentCourse } from '@/infra/analytics/utils/currentCourseSync'
import type { User } from '@/infra/types/content'

async function fetchSignedInUserId(): Promise<string | null | undefined> {
  try {
    const response = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' })
    if (!response.ok) return undefined
    const data = (await response.json()) as { user?: { id?: string } | null }
    return data.user?.id ?? null
  } catch {
    return undefined // network blip — not evidence of an account switch
  }
}

export function useUserStorageOwnership(user: User | null, isLoading: boolean): void {
  const router = useRouter()
  const userId = user?.id ?? null
  const serverCourseId = user?.courseSelection?.courseId ?? null

  // Another tab signed in as someone else (or logged out). The login cookie is
  // shared, so this tab would keep showing the old student while every write
  // lands on the new one — reload so it becomes the new session.
  useEffect(() => {
    if (isLoading) return

    const unsubscribe = subscribeToOwnerChanges(() => {
      if (readStorageOwner() !== userId) window.location.reload()
    })
    // Backstop for switches that raise no storage event here (another dev
    // hostname, storage blocked): ask the server who is signed in on focus.
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      const signedInId = await fetchSignedInUserId()
      if (signedInId !== undefined && signedInId !== userId) window.location.reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, isLoading])

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
