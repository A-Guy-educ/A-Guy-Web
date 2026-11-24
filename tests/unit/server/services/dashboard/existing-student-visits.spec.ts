/**
 * Existing students logging back in through the signup prompt are dropped
 * from the visitor funnel: recorded ones by stamp, older ones by matching a
 * Google click to a login on an older account within two minutes.
 */

import { ObjectId } from 'mongodb'
import { describe, expect, it } from 'vitest'

import {
  EXISTING_LOGIN_WINDOW_MS,
  excludeExistingStudents,
  existingAccountLoginTimes,
  matchClicksToLogins,
} from '@/server/services/dashboard/existing-student-visits'

const at = (minute: number): Date => new Date(Date.UTC(2026, 10, 20, 10, minute))

describe('matchClicksToLogins', () => {
  const a = new ObjectId()
  const b = new ObjectId()
  const c = new ObjectId()

  it('matches a click followed by a login inside the window only', () => {
    const logins = [at(1).getTime() + 30_000, at(30).getTime()]
    const clicks = [
      { id: a, clickedAt: at(1) }, // login 30s later -> existing student
      { id: b, clickedAt: at(10) }, // nothing for 20 min -> real drop-off
      { id: c, clickedAt: at(31) }, // login came before the click -> not this click
    ]
    expect(matchClicksToLogins(clicks, logins)).toEqual([a])
  })

  it('includes the window edge and nothing past it', () => {
    const t = at(0).getTime()
    expect(
      matchClicksToLogins([{ id: a, clickedAt: at(0) }], [t + EXISTING_LOGIN_WINDOW_MS]),
    ).toEqual([a])
    expect(
      matchClicksToLogins([{ id: a, clickedAt: at(0) }], [t + EXISTING_LOGIN_WINDOW_MS + 1]),
    ).toEqual([])
    expect(matchClicksToLogins([{ id: a, clickedAt: at(0) }], [])).toEqual([])
  })
})

describe('existingAccountLoginTimes', () => {
  it('keeps logins to older accounts in the period, sorted, and drops the signup session', () => {
    const since = at(0)
    const users = [
      { createdAt: at(0), sessions: [{ createdAt: at(1) }, { createdAt: at(40) }] }, // at(1) = signup itself
      {
        createdAt: new Date('2026-09-01'),
        sessions: [{ createdAt: at(20) }, { createdAt: new Date('2026-11-01') }],
      },
      { sessions: [{}] },
    ]
    expect(existingAccountLoginTimes(users, since)).toEqual([at(20).getTime(), at(40).getTime()])
  })
})

describe('excludeExistingStudents', () => {
  it('drops recorded existing-student logins unless the session was claimed by a new account', () => {
    expect(excludeExistingStudents([])).toEqual({
      $nor: [{ 'onboarding.googleOutcome': 'existing_login', claimedByUser: { $exists: false } }],
    })
  })

  it('also drops the estimated sessions', () => {
    const id = new ObjectId()
    expect(excludeExistingStudents([id])._id).toEqual({ $nin: [id] })
  })
})
