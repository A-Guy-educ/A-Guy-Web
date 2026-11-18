/**
 * B2B / other / B2C classification rules (segment-classifier.ts) and the
 * cohort predicates built from them (user-segment.ts).
 */

import { ObjectId } from 'mongodb'
import { describe, expect, it } from 'vitest'

import {
  CONSUMER_EMAIL_RE,
  SCHOOL_ARRIVAL_MATCH,
  classifyUserSegments,
  emailDomain,
  isInstitutionalEmail,
} from '@/server/services/dashboard/segment-classifier'
import {
  buildUserCohort,
  guestCohortMatch,
  userIdStringPredicate,
} from '@/server/services/dashboard/user-segment'

describe('isInstitutionalEmail', () => {
  it.each(['kid@gmail.com', 'Kid@GMAIL.com', 'mom@walla.co.il', 'dad@hotmail.com', 'x@icloud.com'])(
    'treats consumer mail %s as personal',
    (email) => {
      expect(isInstitutionalEmail(email)).toBe(false)
      expect(CONSUMER_EMAIL_RE.test(email)).toBe(true)
    },
  )

  it.each([
    'pupil@inbar.school',
    'pupil@melton.ort.org.il',
    'pupil@educ.org.il',
    'pupil@ort.edu.gov.il',
    'student@mail.tau.ac.il',
  ])('treats %s as institutional', (email) => {
    expect(isInstitutionalEmail(email)).toBe(true)
    expect(CONSUMER_EMAIL_RE.test(email)).toBe(false)
  })

  it('does not match a consumer domain as a suffix of another domain', () => {
    expect(CONSUMER_EMAIL_RE.test('a@notgmail.com')).toBe(false)
    expect(isInstitutionalEmail('a@notgmail.com')).toBe(true)
  })

  it.each([undefined, null, '', 'no-at-sign', 42])('treats %s as not institutional', (email) => {
    expect(isInstitutionalEmail(email)).toBe(false)
  })

  it('reads the domain after the last @', () => {
    expect(emailDomain('a@b@Inbar.School ')).toBe('inbar.school')
  })
})

describe('SCHOOL_ARRIVAL_MATCH', () => {
  const [referrer, landing] = (SCHOOL_ARRIVAL_MATCH.$or as Array<Record<string, RegExp>>).map(
    (clause) => Object.values(clause)[0],
  )

  it('matches Google Classroom referrers only', () => {
    expect(referrer?.test('classroom.google.com')).toBe(true)
    expect(referrer?.test('www.google.com')).toBe(false)
    expect(referrer?.test('fakeclassroom.google.com.evil.io')).toBe(false)
  })

  it.each(['/join', '/JOIN', '/jion', '/join/abc'])('matches landing %s', (path) => {
    expect(landing?.test(path)).toBe(true)
  })

  it.each(['/joined', '/courses/join', '/'])('ignores landing %s', (path) => {
    expect(landing?.test(path)).toBe(false)
  })
})

describe('classifyUserSegments', () => {
  const rostered = new ObjectId()
  const flagged = new ObjectId()
  const schoolMail = new ObjectId()
  const arrival = new ObjectId()
  const consumer = new ObjectId()

  const sets = classifyUserSegments({
    rosterMembers: new Set([rostered.toString()]),
    users: [
      { _id: rostered, email: 'kid@inbar.school' },
      { _id: flagged, email: 'kid@gmail.com', onboardingType: 'b2b' },
      { _id: schoolMail, email: 'kid@inbar.school' },
      { _id: consumer, email: 'kid@gmail.com' },
    ],
    schoolArrivals: new Set([arrival.toString(), rostered.toString()]),
  })

  it('puts roster members and /join-onboarded users in b2b', () => {
    expect([...sets.b2b].sort()).toEqual([rostered.toString(), flagged.toString()].sort())
  })

  it('puts off-roster school mail and school arrivals in other, never b2b users', () => {
    expect([...sets.other].sort()).toEqual([schoolMail.toString(), arrival.toString()].sort())
  })

  it('leaves consumer users out of both sets (they are b2c)', () => {
    expect(sets.b2b.has(consumer.toString())).toBe(false)
    expect(sets.other.has(consumer.toString())).toBe(false)
  })
})

describe('cohort predicates for string ids and guest sessions', () => {
  const a = new ObjectId().toString()
  const b = new ObjectId().toString()
  const sets = { b2b: new Set([a]), other: new Set([b]) }

  it('scopes llm-usage string ids', () => {
    expect(userIdStringPredicate(['admin'], buildUserCohort('other', sets))).toEqual({
      $nin: ['admin'],
      $in: [b],
    })
    expect(userIdStringPredicate(['admin'], buildUserCohort('b2c', sets))).toEqual({
      $nin: ['admin', a, b],
    })
    expect(userIdStringPredicate(['admin'], null)).toEqual({ $nin: ['admin'] })
  })

  it('keeps unclaimed guest sessions and drops claims outside the cohort', () => {
    expect(guestCohortMatch(null)).toEqual({})
    const match = guestCohortMatch(buildUserCohort('b2c', sets))
    expect(match.$or[0]).toEqual({ claimedByUser: { $exists: false } })
    expect(match.$or[1].claimedByUser.$nin).toHaveLength(4) // a, b × ObjectId + string
  })
})
