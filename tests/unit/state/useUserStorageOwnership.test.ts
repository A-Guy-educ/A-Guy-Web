// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '@/infra/types/content'

const mockRefresh = vi.hoisted(() => vi.fn())
const mockClaim = vi.hoisted(() => vi.fn())
const mockApply = vi.hoisted(() => vi.fn())
const mockGetProfile = vi.hoisted(() => vi.fn())
const mockSync = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
const mockReadSignedInOwner = vi.hoisted(() => vi.fn())
const mockClaimGuest = vi.hoisted(() => vi.fn())
const ownerChangeListeners = vi.hoisted(() => new Set<() => void>())

vi.mock('@/client/state/localStorage/userScopedStorage', () => ({
  claimUserStorage: mockClaim,
  readSignedInOwner: mockReadSignedInOwner,
  claimGuestStorage: mockClaimGuest,
  subscribeToOwnerChanges: (onChange: () => void) => {
    ownerChangeListeners.add(onChange)
    return () => ownerChangeListeners.delete(onChange)
  },
}))
vi.mock('@/client/state/localStorage/userProfile', () => ({
  applyServerCourseSelection: mockApply,
  getUserProfile: mockGetProfile,
}))
vi.mock('@/infra/analytics/utils/currentCourseSync', () => ({ syncCurrentCourse: mockSync }))
const mockSeedExamDates = vi.hoisted(() => vi.fn())
vi.mock('@/client/state/learningState/learningStateSync', () => ({
  seedExamDates: mockSeedExamDates,
  queueLearningStateSync: vi.fn(),
}))

import { useUserStorageOwnership } from '@/client/hooks/useUserStorageOwnership'

const SELECTION = { courseId: 'server-course', gradeLevel: '9' }
const user = (overrides: Partial<User> = {}): User => ({ id: 'user-a', ...overrides })

describe('useUserStorageOwnership', () => {
  const reload = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('does nothing while auth is loading', () => {
    renderHook(() => useUserStorageOwnership(user(), true))

    expect(mockClaim).not.toHaveBeenCalled()
    expect(mockClaimGuest).not.toHaveBeenCalled()
  })

  it("guests wipe a previous visitor's leftovers and reload only when something was removed", () => {
    mockClaimGuest.mockReturnValueOnce('wiped').mockReturnValueOnce('kept')

    renderHook(() => useUserStorageOwnership(null, false))
    renderHook(() => useUserStorageOwnership(null, false))

    expect(mockClaim).not.toHaveBeenCalled()
    expect(mockClaimGuest).toHaveBeenCalledTimes(2)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('passes class membership to the claim', () => {
    mockClaim.mockReturnValue('kept')

    renderHook(() => useUserStorageOwnership(user({ isClassMember: true }), false))

    expect(mockClaim).toHaveBeenCalledWith({ userId: 'user-a', isClassMember: true })
  })

  it('reloads after a wipe, with the server course already applied', () => {
    mockClaim.mockReturnValue('wiped')
    mockApply.mockReturnValue(true)

    renderHook(() => useUserStorageOwnership(user({ courseSelection: SELECTION }), false))

    expect(mockApply).toHaveBeenCalledWith(SELECTION)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('refreshes server components when the server course replaced the local one', () => {
    mockClaim.mockReturnValue('kept')
    mockApply.mockReturnValue(true)

    renderHook(() => useUserStorageOwnership(user({ courseSelection: SELECTION }), false))

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not refresh when the local course already matches', () => {
    mockClaim.mockReturnValue('kept')
    mockApply.mockReturnValue(false)

    renderHook(() => useUserStorageOwnership(user({ courseSelection: SELECTION }), false))

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('pushes the local course to the server when the server has none', () => {
    mockClaim.mockReturnValue('adopted')
    mockGetProfile.mockReturnValue({ courseId: 'local-course', gradeLevel: '8' })

    renderHook(() => useUserStorageOwnership(user({ courseSelection: null }), false))

    expect(mockSync).toHaveBeenCalledWith('local-course')
  })

  it("seeds the student's exam dates and tells the countdowns to reload", () => {
    mockClaim.mockReturnValue('kept')
    const examDates = { 'course-1': { exams: [] } }
    const onChanged = vi.fn()
    window.addEventListener('a-guy:exam-dates-changed', onChanged)

    renderHook(() => useUserStorageOwnership(user({ examDates }), false))

    expect(mockSeedExamDates).toHaveBeenCalledWith(examDates)
    expect(onChanged).toHaveBeenCalledTimes(1)
    window.removeEventListener('a-guy:exam-dates-changed', onChanged)
  })

  it("does not seed into storage that still holds the previous student's data", () => {
    mockClaim.mockReturnValue('wiped')

    renderHook(() => useUserStorageOwnership(user({ examDates: {} }), false))

    expect(mockSeedExamDates).not.toHaveBeenCalled()
  })

  describe('another tab switches account', () => {
    const emitOwnerChange = () => ownerChangeListeners.forEach((listener) => listener())

    const focusTabWithServerUser = (serverUserId: string | null) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ user: serverUserId ? { id: serverUserId } : null }),
        }),
      )
      document.dispatchEvent(new Event('visibilitychange'))
    }

    beforeEach(() => {
      ownerChangeListeners.clear()
      mockClaim.mockReturnValue('kept')
    })

    it('reloads a stale tab when another tab claims storage for someone else', () => {
      renderHook(() => useUserStorageOwnership(user(), false))
      mockReadSignedInOwner.mockReturnValue('user-b')

      emitOwnerChange()

      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads a signed-in tab when another tab logs out', () => {
      renderHook(() => useUserStorageOwnership(user(), false))
      mockReadSignedInOwner.mockReturnValue(null)

      emitOwnerChange()

      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads a guest tab when another tab signs in', () => {
      renderHook(() => useUserStorageOwnership(null, false))
      mockReadSignedInOwner.mockReturnValue('user-b')

      emitOwnerChange()

      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('ignores owner events that still name this tab user', () => {
      renderHook(() => useUserStorageOwnership(user(), false))
      mockReadSignedInOwner.mockReturnValue('user-a')

      emitOwnerChange()

      expect(reload).not.toHaveBeenCalled()
    })

    it('reloads on focus when the server reports a different signed-in user', async () => {
      renderHook(() => useUserStorageOwnership(user(), false))

      focusTabWithServerUser('user-b')

      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    })

    it('stays put on focus when the server still reports this user', async () => {
      renderHook(() => useUserStorageOwnership(user(), false))

      focusTabWithServerUser('user-a')

      await waitFor(() => expect(fetch).toHaveBeenCalled())
      expect(reload).not.toHaveBeenCalled()
    })

    it('does not watch while auth is still loading', () => {
      renderHook(() => useUserStorageOwnership(null, true))
      mockReadSignedInOwner.mockReturnValue('user-b')

      emitOwnerChange()

      expect(reload).not.toHaveBeenCalled()
    })
  })
})
