// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getUserProfile, setUserProfile } from '@/client/state/localStorage/userProfile'
import { useTeacherProfileLabel } from '@/ui/web/chat/hooks/useTeacherProfileLabel'

const settings = (slug: string) =>
  new Response(JSON.stringify({ settings: { teacherProfile: { slug, label: `label-${slug}` } } }), {
    status: 200,
  })

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('useTeacherProfileLabel', () => {
  it('starts from the teacher remembered on this computer, before any fetch', () => {
    setUserProfile({ teacherProfileSlug: 'teacher_focused' })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const { result } = renderHook(() => useTeacherProfileLabel(true))
    expect(result.current).toMatchObject({ slug: 'teacher_focused', resolved: true })
  })

  it('stays unresolved while the session is loading, rather than assume a guest', () => {
    const { result } = renderHook(() => useTeacherProfileLabel(false, true))
    expect(result.current).toMatchObject({ slug: null, resolved: false })
  })

  it('resolves guests at once, with the teacher they picked at /start', () => {
    setUserProfile({ teacherProfileSlug: 'teacher_challenging' })
    const { result } = renderHook(() => useTeacherProfileLabel(false))
    expect(result.current).toMatchObject({ slug: 'teacher_challenging', resolved: true })
  })

  it("takes the server's teacher and remembers it for next time", async () => {
    setUserProfile({ teacherProfileSlug: 'teacher_patient' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(settings('teacher_focused')))
    const { result } = renderHook(() => useTeacherProfileLabel(true))
    await waitFor(() => expect(result.current.slug).toBe('teacher_focused'))
    expect(result.current.label).toBe('label-teacher_focused')
    expect(getUserProfile()?.teacherProfileSlug).toBe('teacher_focused')
  })
})
