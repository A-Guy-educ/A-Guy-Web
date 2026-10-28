/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useActiveTimeTracker } from '@/client/hooks/useActiveTimeTracker'

const fetchMock = vi.fn()

describe('useActiveTimeTracker streak timezone', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends the browser IANA timezone with the streak update', async () => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    renderHook(() => useActiveTimeTracker({ isAuthenticated: true }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/stats/streak?timeZone=${encodeURIComponent(timeZone)}`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('does not send a streak update for an unauthenticated user', async () => {
    renderHook(() => useActiveTimeTracker({ isAuthenticated: false }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('useActiveTimeTracker lesson visits', () => {
  const visit = { lessonId: 'lesson-1', visitId: 'visit-aaaaaaaa', contentType: 'pdf' as const }

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function heartbeatBodies() {
    return fetchMock.mock.calls
      .filter(([url]) => url === '/api/stats/heartbeat')
      .map(([, init]) => JSON.parse((init as RequestInit).body as string))
  }

  it('opens the visit immediately with a zero-second ping', () => {
    renderHook(() => useActiveTimeTracker({ isAuthenticated: true, visit }))

    expect(heartbeatBodies()).toEqual([
      { seconds: 0, lessonId: 'lesson-1', visitId: 'visit-aaaaaaaa', contentType: 'pdf' },
    ])
  })

  it('credits the first 30s to a new visit only after 30s on that visit', async () => {
    const { rerender } = renderHook(
      ({ v }) => useActiveTimeTracker({ isAuthenticated: true, visit: v }),
      { initialProps: { v: visit } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })
    const next = { ...visit, lessonId: 'lesson-2', visitId: 'visit-bbbbbbbb' }
    rerender({ v: next })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })

    // 40s wall clock, but neither visit has had 30s yet → no 30s credit.
    expect(heartbeatBodies().map((b) => b.seconds)).toEqual([0, 0])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(heartbeatBodies().at(-1)).toMatchObject({ seconds: 30, visitId: 'visit-bbbbbbbb' })
  })
})
