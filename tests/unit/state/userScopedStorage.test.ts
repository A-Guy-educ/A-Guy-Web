// @vitest-environment jsdom
/**
 * @fileType test
 * @domain client.state
 * @pattern shared-device
 * @ai-summary Pins shared-computer behaviour: a different signed-in user wipes the previous student's
 *   user-scoped keys and course cookies, device keys survive, class members never adopt unowned data,
 *   and logout leaves the browser unowned.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OWNER_CHANGED_KEY,
  STORAGE_OWNER_COOKIE_NAME,
  claimGuestStorage,
  claimUserStorage,
  currentGuestOwner,
  decideStorageClaim,
  readSignedInOwner,
  readStorageOwner,
  releaseUserStorage,
  subscribeToOwnerChanges,
} from '@/client/state/localStorage/userScopedStorage'
import { COURSE_ID_COOKIE_NAME, GRADE_COOKIE_NAME } from '@/client/state/localStorage/userProfile'

const USER_KEYS = [
  'a-guy:user-profile',
  'a-guy:exercise-state:v1:ex-1',
  'a-guy:exercise-state:v1:review-ex-1',
  'a-guy:answers:ex-1',
  'aguy:lessonChatProgress:lesson-1',
  'aguy:lessonChatPercent:lesson-1',
  'a-guy:exam-dates:course-1',
  'lesson-view-mode:lesson-1',
  'aguy:courseTab:algebra',
  'aguy-dismissed-tips',
  'token-usage-alerts:user-a',
  'analytics_user_properties',
  'mixpanel_aliased',
]

const DEVICE_KEYS = ['a-guy:guest-id', 'a-guy:access-gate-timer:algebra', 'payload-theme']

function cookie(name: string): string | null {
  const entry = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return entry ? entry.slice(name.length + 1) : null
}

function clearAllCookies(): void {
  document.cookie.split(';').forEach((raw) => {
    const name = raw.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  })
}

function seedPreviousStudent(owner: string | null): void {
  ;[...USER_KEYS, ...DEVICE_KEYS].forEach((key) => localStorage.setItem(key, 'x'))
  document.cookie = `${GRADE_COOKIE_NAME}=8; path=/`
  document.cookie = `${COURSE_ID_COOKIE_NAME}=course-a; path=/`
  if (owner) document.cookie = `${STORAGE_OWNER_COOKIE_NAME}=${owner}; path=/`
}

describe('decideStorageClaim', () => {
  const THIS_TAB = 'guest:tab-1'

  it.each([
    { owner: 'user-a', isClassMember: false, expected: 'kept' },
    { owner: 'user-a', isClassMember: true, expected: 'kept' },
    { owner: 'user-b', isClassMember: false, expected: 'wiped' },
    { owner: 'user-b', isClassMember: true, expected: 'wiped' },
    // Untagged data predates ownership: whose it is cannot be known.
    { owner: null, isClassMember: false, expected: 'wiped' },
    { owner: null, isClassMember: true, expected: 'wiped' },
    // Guest data from this very tab (start wizard → sign-up) carries over…
    { owner: THIS_TAB, isClassMember: false, expected: 'adopted' },
    // …but never into a school account, and never another tab's.
    { owner: THIS_TAB, isClassMember: true, expected: 'wiped' },
    { owner: 'guest:tab-2', isClassMember: false, expected: 'wiped' },
  ] as const)(
    'owner=$owner classMember=$isClassMember → $expected',
    ({ owner, isClassMember, expected }) => {
      expect(
        decideStorageClaim({ owner, userId: 'user-a', isClassMember, guestOwner: THIS_TAB }),
      ).toBe(expected)
    },
  )

  it('never adopts untagged data, even when this tab has no guest tag (storage blocked)', () => {
    expect(
      decideStorageClaim({ owner: null, userId: 'user-a', isClassMember: false, guestOwner: null }),
    ).toBe('wiped')
  })
})

describe('claimUserStorage / releaseUserStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearAllCookies()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('wipes the previous student data when another user signs in, keeping device keys', () => {
    seedPreviousStudent('user-b')

    expect(claimUserStorage({ userId: 'user-a', isClassMember: false })).toBe('wiped')

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    DEVICE_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
    expect(cookie(GRADE_COOKIE_NAME)).toBeNull()
    expect(cookie(COURSE_ID_COOKIE_NAME)).toBeNull()
    expect(readStorageOwner()).toBe('user-a')
  })

  it('keeps everything when the owner signs back in', () => {
    seedPreviousStudent('user-a')

    expect(claimUserStorage({ userId: 'user-a', isClassMember: true })).toBe('kept')

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
    expect(cookie(COURSE_ID_COOKIE_NAME)).toBe('course-a')
  })

  it('wipes untagged data from before ownership, for every account (used pilot computers)', () => {
    seedPreviousStudent(null)

    expect(claimUserStorage({ userId: 'user-a', isClassMember: false })).toBe('wiped')

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    expect(cookie(COURSE_ID_COOKIE_NAME)).toBeNull()
    expect(readStorageOwner()).toBe('user-a')
  })

  it("carries this tab's guest picks into a new home account (start wizard → sign-up)", () => {
    seedPreviousStudent(currentGuestOwner())

    expect(claimUserStorage({ userId: 'user-a', isClassMember: false })).toBe('adopted')

    expect(cookie(COURSE_ID_COOKIE_NAME)).toBe('course-a')
    expect(readStorageOwner()).toBe('user-a')
  })

  it('never lets a school account take over guest data, even from this tab', () => {
    seedPreviousStudent(currentGuestOwner())

    expect(claimUserStorage({ userId: 'user-a', isClassMember: true })).toBe('wiped')

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it("wipes another tab's guest data at sign-in", () => {
    seedPreviousStudent('guest:closed-tab')

    expect(claimUserStorage({ userId: 'user-a', isClassMember: false })).toBe('wiped')
  })

  it("logout wipes user data and hands the browser to this tab's guest", () => {
    seedPreviousStudent('user-a')

    releaseUserStorage()

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    DEVICE_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
    expect(cookie(COURSE_ID_COOKIE_NAME)).toBeNull()
    expect(readStorageOwner()).toBe(currentGuestOwner())
    expect(readSignedInOwner()).toBeNull()
  })

  describe('claimGuestStorage', () => {
    it('wipes untagged leftovers before a guest sees them, and tags the tab', () => {
      seedPreviousStudent(null)

      expect(claimGuestStorage()).toBe('wiped')

      USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
      expect(readStorageOwner()).toBe(currentGuestOwner())
    })

    it("wipes another tab's guest data", () => {
      seedPreviousStudent('guest:closed-tab')

      expect(claimGuestStorage()).toBe('wiped')
      expect(readStorageOwner()).toBe(currentGuestOwner())
    })

    it("keeps this tab's own guest data", () => {
      seedPreviousStudent(currentGuestOwner())

      expect(claimGuestStorage()).toBe('kept')
      USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
    })

    it("leaves a user's data alone (a failed /api/users/me also looks like a guest)", () => {
      seedPreviousStudent('user-a')

      expect(claimGuestStorage()).toBe('kept')
      USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
      expect(readStorageOwner()).toBe('user-a')
    })

    it('reports kept when there was nothing to wipe (no reload needed)', () => {
      expect(claimGuestStorage()).toBe('kept')
      expect(readStorageOwner()).toBe(currentGuestOwner())
    })
  })

  it('signals other tabs on every owner change, but not when the owner is kept', () => {
    seedPreviousStudent('user-b')

    claimUserStorage({ userId: 'user-a', isClassMember: false })
    const afterClaim = localStorage.getItem(OWNER_CHANGED_KEY)
    expect(afterClaim).toMatch(/^user-a:\d+$/)

    claimUserStorage({ userId: 'user-a', isClassMember: false })
    expect(localStorage.getItem(OWNER_CHANGED_KEY)).toBe(afterClaim)

    releaseUserStorage()
    expect(localStorage.getItem(OWNER_CHANGED_KEY)).toMatch(/^guest:[\w-]+:\d+$/)
  })
})

describe('subscribeToOwnerChanges', () => {
  it('fires only for the owner-changed key', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToOwnerChanges(onChange)

    window.dispatchEvent(new StorageEvent('storage', { key: 'a-guy:user-profile' }))
    window.dispatchEvent(new StorageEvent('storage', { key: OWNER_CHANGED_KEY }))
    unsubscribe()
    window.dispatchEvent(new StorageEvent('storage', { key: OWNER_CHANGED_KEY }))

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
