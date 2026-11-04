/**
 * localStorage utilities for exam date tracking per course.
 * SSR-safe implementations that check for window availability.
 *
 * localStorage is a cache: every save is queued for the server copy
 * (learningStateSync), which is seeded back on sign-in from `/api/users/me`
 * and announced with EXAM_DATES_CHANGED_EVENT.
 *
 * Data is stored per-course using the course ID as key.
 * Each entry holds an array of exam objects with id, date, and optional label.
 */

import { EXAM_DATES_PREFIX } from '@/client/state/learningState/learningStateKeys'
import { queueLearningStateSync } from '@/client/state/learningState/learningStateSync'

export interface ExamDate {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  label?: string
}

interface ExamDatesData {
  exams: ExamDate[]
}

const STORAGE_KEY_PREFIX = EXAM_DATES_PREFIX

/** Fired when exam dates change outside the hook that edited them (server seed). */
export const EXAM_DATES_CHANGED_EVENT = 'a-guy:exam-dates-changed'

export const getExamDates = (courseId: string): ExamDate[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${courseId}`)
    if (!raw) return []
    const data: ExamDatesData = JSON.parse(raw)
    return data.exams ?? []
  } catch {
    return []
  }
}

export const setExamDates = (courseId: string, exams: ExamDate[]): void => {
  if (typeof window === 'undefined') return
  try {
    const data: ExamDatesData = { exams }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${courseId}`, JSON.stringify(data))
    queueLearningStateSync({ kind: 'exam-dates', key: courseId })
  } catch {
    // Storage full or unavailable
  }
}

export const addExamDate = (courseId: string, exam: ExamDate): void => {
  const current = getExamDates(courseId)
  setExamDates(courseId, [...current, exam])
}

export const removeExamDate = (courseId: string, examId: string): void => {
  const current = getExamDates(courseId)
  setExamDates(
    courseId,
    current.filter((e) => e.id !== examId),
  )
}
