/**
 * Ownership of this browser's per-user storage. SSR-safe.
 *
 * Schools share computers, so anything a student leaves in localStorage
 * (course pick, lesson answers, exam dates, analytics identity) would
 * otherwise show up for the next student. Every user-scoped key is listed
 * here; the `a-guy:owner` cookie records who they belong to: a user id, or
 * `guest:<tab token>` for data written while signed out in one browser tab.
 *
 * The priority is that nobody ever inherits data that is not theirs; losing
 * data is acceptable. So:
 *
 * - On sign-in / page load, `claimUserStorage` keeps the student's own data
 *   and wipes everything else, with one exception: guest data written in this
 *   same tab (the start wizard right before sign-up) carries into the account,
 *   except for school accounts. Untagged data predates ownership and on a used
 *   school computer could be anyone's — always wiped.
 * - On a guest page load, `claimGuestStorage` wipes untagged data and other
 *   tabs' guest data, then tags the browser with this tab's guest owner. Data
 *   owned by a user is left alone: a failed `/api/users/me` also looks like a
 *   guest, and the next sign-in decides.
 * - On logout, `releaseUserStorage` wipes the keys and hands the browser to
 *   this tab's guest.
 *
 * Device-level keys (guest id, access-gate timers, pane sizes, theme,
 * accent) are deliberately not listed — they are not personal data.
 * A new key that holds a student's own data MUST be added below.
 */

import { COURSE_ID_COOKIE_NAME, GRADE_COOKIE_NAME } from './userProfile'

/** Cookie (not localStorage) so server components can read it too. */
export const STORAGE_OWNER_COOKIE_NAME = 'a-guy:owner'

const OWNER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const GUEST_OWNER_PREFIX = 'guest:'
/** sessionStorage: per tab, survives the same-tab OAuth round trip, not a new tab. */
const GUEST_TAB_TOKEN_KEY = 'a-guy:guest-tab'

const isGuestOwner = (owner: string | null): boolean =>
  owner?.startsWith(GUEST_OWNER_PREFIX) ?? false

/** Owner tag for data written while signed out in this tab. Null if storage is blocked. */
export const currentGuestOwner = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    let token = sessionStorage.getItem(GUEST_TAB_TOKEN_KEY)
    if (!token) {
      token = crypto.randomUUID()
      sessionStorage.setItem(GUEST_TAB_TOKEN_KEY, token)
    }
    return `${GUEST_OWNER_PREFIX}${token}`
  } catch {
    return null
  }
}

/**
 * localStorage key bumped on every owner change. Cookies fire no events, so
 * this is how other open tabs learn the account changed (`storage` event).
 * Device-level: deliberately not in USER_SCOPED_KEY_PREFIXES.
 */
export const OWNER_CHANGED_KEY = 'a-guy:owner-changed'

/** localStorage key prefixes (exact keys are prefixes of themselves). */
export const USER_SCOPED_KEY_PREFIXES = [
  'a-guy:user-profile',
  'a-guy:exercise-state:',
  'a-guy:answers:',
  'aguy:lessonChat',
  'a-guy:exam-dates:',
  'lesson-view-mode:',
  'aguy:courseTab:',
  'aguy-dismissed-tips',
  'token-usage-alerts:',
  'analytics_user_properties',
  'mixpanel_aliased',
  'a-guy:learning-state-pending',
  'a-guy:notebook-draft:',
] as const

const USER_SCOPED_COOKIES = [GRADE_COOKIE_NAME, COURSE_ID_COOKIE_NAME] as const

export type StorageClaim = 'kept' | 'adopted' | 'wiped'

/**
 * - Owned by this user → keep.
 * - Written as a guest in this very tab (start wizard → sign-up) → adopt it,
 *   except for class members: school accounts never take over guest data.
 * - Anything else — another user, another tab's guest, untagged data from
 *   before ownership existed → wipe.
 */
export function decideStorageClaim({
  owner,
  userId,
  isClassMember,
  guestOwner,
}: {
  owner: string | null
  userId: string
  isClassMember: boolean
  /** This tab's guest owner tag (`currentGuestOwner()`). */
  guestOwner: string | null
}): StorageClaim {
  if (owner === userId) return 'kept'
  if (owner !== null && owner === guestOwner && !isClassMember) return 'adopted'
  return 'wiped'
}

/** The user id this browser's storage belongs to; null when unowned or a guest's. */
export const readSignedInOwner = (): string | null => {
  const owner = readStorageOwner()
  return isGuestOwner(owner) ? null : owner
}

export const readStorageOwner = (): string | null => {
  if (typeof document === 'undefined') return null
  const prefix = `${STORAGE_OWNER_COOKIE_NAME}=`
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) || null : null
}

const writeStorageOwner = (owner: string | null): void => {
  document.cookie = owner
    ? `${STORAGE_OWNER_COOKIE_NAME}=${encodeURIComponent(owner)}; path=/; max-age=${OWNER_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    : `${STORAGE_OWNER_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  try {
    localStorage.setItem(OWNER_CHANGED_KEY, `${owner ?? ''}:${Date.now()}`)
  } catch {
    // Storage unavailable — other tabs fall back to the visibility check
  }
}

/** Call `onChange` when another tab claims or releases this browser's storage. */
export const subscribeToOwnerChanges = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {}
  const handler = (event: StorageEvent) => {
    if (event.key === OWNER_CHANGED_KEY) onChange()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

const isUserScopedKey = (key: string): boolean =>
  USER_SCOPED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))

const hasCookie = (name: string): boolean =>
  document.cookie.split('; ').some((part) => part.startsWith(`${name}=`))

/**
 * Remove every user-scoped localStorage key and the course cookies.
 * Returns whether anything was there to remove.
 */
export const clearUserScopedStorage = (): boolean => {
  if (typeof window === 'undefined') return false
  let removed = false
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    keys
      .filter((key): key is string => key !== null && isUserScopedKey(key))
      .forEach((key) => {
        localStorage.removeItem(key)
        removed = true
      })
  } catch {
    // Storage unavailable (private mode / blocked) — nothing to clear
  }
  USER_SCOPED_COOKIES.filter(hasCookie).forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
    removed = true
  })
  return removed
}

/** Make this browser's user-scoped storage belong to `userId`. */
export const claimUserStorage = ({
  userId,
  isClassMember,
}: {
  userId: string
  isClassMember: boolean
}): StorageClaim => {
  if (typeof window === 'undefined') return 'kept'
  const claim = decideStorageClaim({
    owner: readStorageOwner(),
    userId,
    isClassMember,
    guestOwner: currentGuestOwner(),
  })
  if (claim === 'wiped') clearUserScopedStorage()
  if (claim !== 'kept') writeStorageOwner(userId)
  return claim
}

/**
 * Guest page load: untagged data (predates ownership) and other tabs' guest
 * data could be any previous visitor's — wipe it, then mark what this guest
 * writes next as theirs. A user's data is left for the next sign-in to judge.
 * Returns 'wiped' only when something was actually removed.
 */
export const claimGuestStorage = (): Extract<StorageClaim, 'kept' | 'wiped'> => {
  if (typeof window === 'undefined') return 'kept'
  const owner = readStorageOwner()
  const guestOwner = currentGuestOwner()
  if (owner === guestOwner || (owner !== null && !isGuestOwner(owner))) return 'kept'
  const removed = clearUserScopedStorage()
  writeStorageOwner(guestOwner)
  return removed ? 'wiped' : 'kept'
}

/** Logout: wipe user-scoped storage; anything written next is this tab's guest's. */
export const releaseUserStorage = (): void => {
  if (typeof window === 'undefined') return
  clearUserScopedStorage()
  writeStorageOwner(currentGuestOwner())
}
