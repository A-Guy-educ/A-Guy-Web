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
  STORAGE_OWNER_COOKIE_NAME,
  claimUserStorage,
  decideStorageClaim,
  readStorageOwner,
  releaseUserStorage,
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
  it.each([
    { owner: 'user-a', isClassMember: false, expected: 'kept' },
    { owner: 'user-a', isClassMember: true, expected: 'kept' },
    { owner: 'user-b', isClassMember: false, expected: 'wiped' },
    { owner: 'user-b', isClassMember: true, expected: 'wiped' },
    { owner: null, isClassMember: false, expected: 'adopted' },
    { owner: null, isClassMember: true, expected: 'wiped' },
  ] as const)(
    'owner=$owner classMember=$isClassMember → $expected',
    ({ owner, isClassMember, expected }) => {
      expect(decideStorageClaim({ owner, userId: 'user-a', isClassMember })).toBe(expected)
    },
  )
})

describe('claimUserStorage / releaseUserStorage', () => {
  beforeEach(() => {
    localStorage.clear()
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

  it('adopts unowned data for a non-school user (guest progress carries into the account)', () => {
    seedPreviousStudent(null)

    expect(claimUserStorage({ userId: 'user-a', isClassMember: false })).toBe('adopted')

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
    expect(readStorageOwner()).toBe('user-a')
  })

  it('wipes unowned data for a class member (likely a classmate on a shared computer)', () => {
    seedPreviousStudent(null)

    expect(claimUserStorage({ userId: 'user-a', isClassMember: true })).toBe('wiped')

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    expect(readStorageOwner()).toBe('user-a')
  })

  it('logout wipes user data and leaves the browser unowned', () => {
    seedPreviousStudent('user-a')

    releaseUserStorage()

    USER_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    DEVICE_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
    expect(cookie(COURSE_ID_COOKIE_NAME)).toBeNull()
    expect(readStorageOwner()).toBeNull()
  })
})
