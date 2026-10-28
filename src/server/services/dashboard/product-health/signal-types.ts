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

/**
 * One user's lesson visits on one calendar day (by visit start). Every row
 * means "present"; `maxPdfDwellSeconds` decides "active" against the
 * request's dwell threshold.
 */
export interface VisitDay extends UserDay {
  maxPdfDwellSeconds: number
}

/** PDF lesson visits started on one calendar day, and how many scrolled. */
export interface PdfVisitDay {
  date: string
  visits: number
  scrolled: number
}

export interface AllSignals {
  visitDays: VisitDay[]
  chatDays: UserDay[]
  pdfVisitDays: PdfVisitDay[]
  /** YYYY-MM-DD registration day of each eligible user registered in the span. */
  registrationDays: string[]
  /**
   * First UTC midnight fully covered by the `lesson-visits` log, or null
   * when the log is empty. Visit-based KPIs return "no data" for any
   * window that reaches back before it.
   */
  visitLogCoverageStart: string | null
}

export type WindowSpec = Window
