/**
 * Ownership of this browser's per-user storage. SSR-safe.
 *
 * Schools share computers, so anything a student leaves in localStorage
 * (course pick, lesson answers, exam dates, analytics identity) would
 * otherwise show up for the next student. Every user-scoped key is listed
 * here; the `a-guy:owner` cookie records which user they belong to.
 *
 * - On sign-in / page load, `claimUserStorage` compares the owner with the
 *   signed-in user and wipes the keys when they belong to someone else.
 * - On logout, `releaseUserStorage` wipes them and drops the owner.
 *
 * Device-level keys (guest id, access-gate timers, pane sizes, theme,
 * accent) are deliberately not listed — they are not personal data.
 * A new key that holds a student's own data MUST be added below.
 */

import { COURSE_ID_COOKIE_NAME, GRADE_COOKIE_NAME } from './userProfile'

/** Cookie (not localStorage) so server components can read it too. */
export const STORAGE_OWNER_COOKIE_NAME = 'a-guy:owner'

const OWNER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

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
] as const

const USER_SCOPED_COOKIES = [GRADE_COOKIE_NAME, COURSE_ID_COOKIE_NAME] as const

export type StorageClaim = 'kept' | 'adopted' | 'wiped'

/**
 * - Owned by this user → keep.
 * - Owned by someone else → wipe.
 * - Unowned (written before ownership existed, or by a guest who then signed
 *   in) → adopt it, except for class members: on a school computer unowned
 *   data is more likely a classmate's than their own.
 */
export function decideStorageClaim({
  owner,
  userId,
  isClassMember,
}: {
  owner: string | null
  userId: string
  isClassMember: boolean
}): StorageClaim {
  if (owner === userId) return 'kept'
  if (owner || isClassMember) return 'wiped'
  return 'adopted'
}

export const readStorageOwner = (): string | null => {
  if (typeof document === 'undefined') return null
  const prefix = `${STORAGE_OWNER_COOKIE_NAME}=`
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) || null : null
}

const writeStorageOwner = (userId: string | null): void => {
  document.cookie = userId
    ? `${STORAGE_OWNER_COOKIE_NAME}=${encodeURIComponent(userId)}; path=/; max-age=${OWNER_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
    : `${STORAGE_OWNER_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

const isUserScopedKey = (key: string): boolean =>
  USER_SCOPED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))

/** Remove every user-scoped localStorage key and the course cookies. */
export const clearUserScopedStorage = (): void => {
  if (typeof window === 'undefined') return
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    keys
      .filter((key): key is string => key !== null && isUserScopedKey(key))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage unavailable (private mode / blocked) — nothing to clear
  }
  USER_SCOPED_COOKIES.forEach((name) => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
  })
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
  const claim = decideStorageClaim({ owner: readStorageOwner(), userId, isClassMember })
  if (claim === 'wiped') clearUserScopedStorage()
  if (claim !== 'kept') writeStorageOwner(userId)
  return claim
}

/** Logout: wipe user-scoped storage and leave the browser unowned. */
export const releaseUserStorage = (): void => {
  if (typeof window === 'undefined') return
  clearUserScopedStorage()
  writeStorageOwner(null)
}
