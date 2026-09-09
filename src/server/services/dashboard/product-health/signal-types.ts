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

/** Identified-user snapshot; per-bucket count uses `createdAt <= bucket.end`. */
export interface IdentifiedPopulation {
  createdAt: Map<string, Date>
}

export interface AllSignals {
  lessonActiveDays: UserDay[]
  chatDays: UserDay[]
  lessonAttempts: LessonAttempt[]
  population: IdentifiedPopulation
}

export type WindowSpec = Window
