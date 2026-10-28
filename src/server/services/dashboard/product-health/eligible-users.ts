/**
 * Resolves the pool of users a single Product Health request measures.
 *
 * Applies the §9 decisions Shai locked in:
 *   - Exclude `role='admin'`.
 *   - Exclude any user whose email ends in a domain from
 *     `PRODUCT_HEALTH_EXCLUDED_DOMAINS` (comma-separated env var,
 *     defaults to `aguy.co.il` so our own testing doesn't skew numbers).
 *   - When `courseId` and/or `grade` is set, restrict to accounts whose
 *     `currentCourse` currently matches (snapshot — see course-scope.ts).
 *
 * Returned `refs` is a flat list of userId ObjectIds *and* their string
 * form so signal queries can `$in`-match regardless of which encoding the
 * record used at write time (see progress.ts — the write path emits both
 * shapes over its lifetime).
 *
 * `registrationDays` feeds Total New Registered Users: the UTC day of
 * `registeredAt` (falls back to `createdAt`) for every eligible user who
 * registered inside the span.
 */

import { ObjectId, type Db } from 'mongodb'

import { resolveCurrentCourseMatch } from './course-scope'
import type { SignalSpan } from './signal-types'

const DEFAULT_EXCLUDED_DOMAINS = 'aguy.co.il'

export interface EligibleUsers {
  refs: unknown[]
  registrationDays: string[]
}

export interface UserScope {
  courseId: string | null
  grade: string | null
}

interface UserRow {
  _id: unknown
  registeredAt?: unknown
  createdAt?: unknown
}

function excludedDomains(): string[] {
  const raw = process.env.PRODUCT_HEALTH_EXCLUDED_DOMAINS ?? DEFAULT_EXCLUDED_DOMAINS
  return raw
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function excludedEmailRegex(): RegExp | null {
  const domains = excludedDomains()
  if (domains.length === 0) return null
  const alternation = domains.map(escapeRegex).join('|')
  return new RegExp(`@(?:${alternation})$`, 'i')
}

function registrationDay(row: UserRow, span: SignalSpan): string | null {
  const at = row.registeredAt instanceof Date ? row.registeredAt : row.createdAt
  if (!(at instanceof Date) || at < span.start || at >= span.end) return null
  return at.toISOString().slice(0, 10)
}

export async function fetchEligibleUsers(
  db: Db,
  span: SignalSpan,
  scope: UserScope,
): Promise<EligibleUsers> {
  const match: Record<string, unknown> = {
    role: { $ne: 'admin' },
    email: { $exists: true, $ne: '' },
    createdAt: { $lte: span.end },
  }
  const excludeRegex = excludedEmailRegex()
  if (excludeRegex) match.email = { $exists: true, $ne: '', $not: excludeRegex }
  const currentCourse = await resolveCurrentCourseMatch(db, scope.courseId, scope.grade)
  if (currentCourse) match.currentCourse = currentCourse

  const rows = (await db
    .collection('users')
    .find(match, { projection: { _id: 1, registeredAt: 1, createdAt: 1 } })
    .toArray()) as UserRow[]

  const refs: unknown[] = []
  const registrationDays: string[] = []
  for (const row of rows) {
    const idStr = String(row._id)
    if (ObjectId.isValid(idStr)) {
      refs.push(row._id as ObjectId, idStr)
    } else {
      refs.push(idStr)
    }
    const day = registrationDay(row, span)
    if (day) registrationDays.push(day)
  }
  return { refs, registrationDays }
}
