/**
 * Shared shapes for the raw signals fetched from Mongo. Each KPI reduces
 * one of these into a (numerator, denominator) pair per window.
 */

import type { Window } from './windows'

export interface SignalSpan {
  start: Date
  end: Date
}

/** One user being active on one calendar day. */
export interface UserDay {
  userId: string
  date: string
}

/** One lesson attempt (record) with a completed flag. */
export interface LessonAttempt {
  date: string
  completed: boolean
}

export interface AllSignals {
  lessonActiveDays: UserDay[]
  chatDays: UserDay[]
  lessonAttempts: LessonAttempt[]
  presentUserDays: UserDay[]
}

export type WindowSpec = Window
