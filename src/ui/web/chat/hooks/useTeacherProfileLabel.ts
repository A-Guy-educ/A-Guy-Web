'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

import { getUserProfile, setUserProfile } from '@/client/state/localStorage/userProfile'

interface TeacherProfileLabel {
  label: string | null
  slug: string | null
  isLoading: boolean
  /**
   * The teacher is known: from the last visit's copy on this computer, or
   * from the server. Until then `slug` is null and a portrait would show the
   * default teacher — callers hide it rather than flash the wrong one.
   */
  resolved: boolean
}

/**
 * Fetches the authenticated user's selected teacher profile label and slug.
 * The slug is remembered in the (per-student) local profile, so a return
 * visit has it before the fetch; guests keep the teacher they picked at
 * /start, which is stored there too. Pass `isAuthLoading` so a still-loading
 * session is not taken for a guest.
 */
export function useTeacherProfileLabel(
  isAuthenticated: boolean,
  isAuthLoading = false,
): TeacherProfileLabel {
  const [label, setLabel] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resolved, setResolved] = useState(false)

  // Before the first paint after hydration, so the remembered teacher is the
  // first one the student sees.
  useLayoutEffect(() => {
    const remembered = getUserProfile()?.teacherProfileSlug
    if (!remembered) return
    setSlug(remembered)
    setResolved(true)
  }, [])

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated) {
      setLabel(null)
      setResolved(true)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    const doFetch = async () => {
      try {
        const res = await fetch('/api/user-settings', {
          credentials: 'include',
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (!res.ok) {
          setLabel(null)
          return
        }
        const data = await res.json()
        if (controller.signal.aborted) return
        const fetchedSlug: string | null = data.settings?.teacherProfile?.slug ?? null
        setLabel(data.settings?.teacherProfile?.label ?? null)
        setSlug(fetchedSlug)
        if (fetchedSlug && fetchedSlug !== getUserProfile()?.teacherProfileSlug) {
          setUserProfile({ teacherProfileSlug: fetchedSlug })
        }
      } catch {
        if (!controller.signal.aborted) setLabel(null)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
          setResolved(true)
        }
      }
    }

    doFetch()
    return () => controller.abort()
  }, [isAuthenticated, isAuthLoading])

  return { label, slug, isLoading, resolved }
}
