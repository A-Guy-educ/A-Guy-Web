// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '@/infra/types/content'

const mockRefresh = vi.hoisted(() => vi.fn())
const mockClaim = vi.hoisted(() => vi.fn())
const mockApply = vi.hoisted(() => vi.fn())
const mockGetProfile = vi.hoisted(() => vi.fn())
const mockSync = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
vi.mock('@/client/state/localStorage/userScopedStorage', () => ({
  claimUserStorage: mockClaim,
}))
vi.mock('@/client/state/localStorage/userProfile', () => ({
  applyServerCourseSelection: mockApply,
  getUserProfile: mockGetProfile,
}))
vi.mock('@/infra/analytics/utils/currentCourseSync', () => ({ syncCurrentCourse: mockSync }))

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
    vi.unstubAllGlobals()
  })

  it('does nothing while auth is loading or for guests', () => {
    renderHook(() => useUserStorageOwnership(user(), true))
    renderHook(() => useUserStorageOwnership(null, false))

    expect(mockClaim).not.toHaveBeenCalled()
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
})
