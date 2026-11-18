/**
 * Pure B2B / other / B2C classification rules for the dashboard `segment`
 * toggle. I/O lives in user-segment.ts; keeping the rules here makes them
 * unit-testable without Mongo.
 *
 * First match wins:
 * - b2b:   on a class roster, or onboarded through /join (`onboardingType: 'b2b'`)
 * - other: school-driven but not on a roster — an institutional (non-consumer)
 *          email domain, or a claimed guest session that arrived from Google
 *          Classroom or first landed on /join
 * - b2c:   everyone else
 *
 * The email rule is inverted on purpose: school domains (ORT branches,
 * municipal edu networks, `*.school`, universities) are too varied to list,
 * while personal mailbox providers are a short, stable set. A parent signing
 * up with a work address lands in `other` — accepted, it keeps b2c clean.
 */

import type { Document } from 'mongodb'

import { relationId } from '@/infra/db/content-db'

export const CONSUMER_EMAIL_DOMAINS: readonly string[] = [
  'gmail.com',
  'googlemail.com',
  'walla.co.il',
  'walla.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.il',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'ukr.net',
  'mail.ru',
  'yandex.ru',
  'bezeqint.net',
  'netvision.net.il',
  '012.net.il',
  'zahav.net.il',
  'smile.net.il',
]

const CONSUMER_SET = new Set(CONSUMER_EMAIL_DOMAINS)

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Matches emails at a consumer provider — used to pre-filter `users` in Mongo. */
export const CONSUMER_EMAIL_RE = new RegExp(
  `@(${CONSUMER_EMAIL_DOMAINS.map(escapeRegex).join('|')})$`,
  'i',
)

/**
 * guest-sessions filter for claimed sessions that arrived through a school
 * channel. `/jion` and `/JOIN` are real typos seen in prod landing paths.
 */
export const SCHOOL_ARRIVAL_MATCH: Document = {
  claimedByUser: { $exists: true },
  $or: [
    { referrerHost: /(^|\.)classroom\.google\.com$/ },
    { landingPath: /^\/(join|jion)(\/|$)/i },
  ],
}

export function emailDomain(email: unknown): string {
  if (typeof email !== 'string') return ''
  const at = email.lastIndexOf('@')
  return at < 0
    ? ''
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase()
}

export function isInstitutionalEmail(email: unknown): boolean {
  const domain = emailDomain(email)
  return domain !== '' && !CONSUMER_SET.has(domain)
}

export interface SegmentUserDoc {
  _id: unknown
  email?: unknown
  onboardingType?: unknown
}

/** Non-b2c id sets; b2c is everyone not in either. */
export interface UserSegmentSets {
  b2b: ReadonlySet<string>
  other: ReadonlySet<string>
}

export function classifyUserSegments(input: {
  rosterMembers: ReadonlySet<string>
  users: readonly SegmentUserDoc[]
  schoolArrivals: ReadonlySet<string>
}): UserSegmentSets {
  const { rosterMembers, users, schoolArrivals } = input
  const ids = users.flatMap((user) => {
    const id = relationId(user._id)
    return id ? [{ id, user }] : []
  })
  const b2bByFlag = ids.filter(({ user }) => user.onboardingType === 'b2b').map(({ id }) => id)
  const b2b = new Set([...rosterMembers, ...b2bByFlag])
  const other = new Set(
    ids
      .filter(({ id, user }) => !b2b.has(id) && isInstitutionalEmail(user.email))
      .map(({ id }) => id)
      .concat([...schoolArrivals].filter((id) => !b2b.has(id))),
  )
  return { b2b, other }
}
