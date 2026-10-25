/**
 * Shapes already-loaded class data into the teacher dashboard progress
 * response. Pure, so the status/omission rules are testable without a DB.
 *
 * @fileType service
 * @domain teacher-dashboard
 * @pattern response-shaping
 * @ai-summary Builds the /api/teacher/classes/:id/progress payload from lessons, progress docs and attempts
 */

import type { ProgressRecord } from '@/server/web-api/progress'

/** Heartbeat writes per-lesson time into this gradeLevel bucket only. */
export const TIME_BUCKET_GRADE_LEVEL = 'default'

export type LessonStatus = 'not_started' | 'in_progress' | 'completed'
export type QuestionStatus = 'unseen' | 'solved' | 'unsolved'

export interface LessonQuestions {
  id: string
  title: string
  /** Question blocks in render order. */
  questions: Array<{ exerciseId: string; blockId: string }>
}

export interface ProgressDocInput {
  user: string
  gradeLevel?: string
  progressRecords?: ProgressRecord[]
}

export interface AttemptInput {
  user: string
  lesson: string
  exercise: string
  block: string
  solved?: boolean
  wrongCount?: number
  hintCount?: number
  explanationCount?: number
}

export interface QuestionProgress {
  id: string
  status: QuestionStatus
  mistakes: number
  hints: number
  explanations: number
}

export interface StudentLessonProgress {
  status: LessonStatus
  minutes: number
  questions: QuestionProgress[]
}

export interface ClassProgressResponse {
  class: { id: string; name: string }
  lessons: Array<{ id: string; title: string; questionCount: number }>
  students: Array<{ id: string; name: string; lessons: Record<string, StudentLessonProgress> }>
}

const STATUS_RANK: Record<LessonStatus, number> = { not_started: 0, in_progress: 1, completed: 2 }

function asLessonStatus(value: unknown): LessonStatus | null {
  return value === 'not_started' || value === 'in_progress' || value === 'completed' ? value : null
}

function maxStatus(a: LessonStatus | null, b: LessonStatus | null): LessonStatus | null {
  if (!a) return b
  if (!b) return a
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a
}

/** Response question id; block ids alone can repeat across duplicated exercises. */
export function questionKey(exerciseId: string, blockId: string): string {
  return `${exerciseId}:${blockId}`
}

function questionProgress(id: string, attempt: AttemptInput | undefined): QuestionProgress {
  const mistakes = attempt?.wrongCount ?? 0
  const status: QuestionStatus = attempt?.solved ? 'solved' : mistakes > 0 ? 'unsolved' : 'unseen'
  return {
    id,
    status,
    mistakes,
    hints: attempt?.hintCount ?? 0,
    explanations: attempt?.explanationCount ?? 0,
  }
}

interface LessonRecordSummary {
  status: LessonStatus | null
  seconds: number
}

/** Merge a student's lesson records across gradeLevel buckets. */
function summarizeRecords(docs: ProgressDocInput[]): Map<string, LessonRecordSummary> {
  const byLesson = new Map<string, LessonRecordSummary>()
  for (const doc of docs) {
    const isTimeBucket = doc.gradeLevel === TIME_BUCKET_GRADE_LEVEL
    for (const record of doc.progressRecords ?? []) {
      if (record.recordType !== 'lesson' || !record.recordId) continue
      const prev = byLesson.get(record.recordId) ?? { status: null, seconds: 0 }
      byLesson.set(record.recordId, {
        status: maxStatus(prev.status, asLessonStatus(record.status)),
        seconds: prev.seconds + (isTimeBucket ? Number(record.timeSpentSeconds) || 0 : 0),
      })
    }
  }
  return byLesson
}

export function buildClassProgress(input: {
  classId: string
  className: string
  lessons: LessonQuestions[]
  students: Array<{ id: string; name: string }>
  progressDocs: ProgressDocInput[]
  attempts: AttemptInput[]
}): ClassProgressResponse {
  const attemptsByKey = new Map(
    input.attempts.map((a) => [`${a.user}|${questionKey(a.exercise, a.block)}`, a]),
  )
  const lessonsWithAttempts = new Set(input.attempts.map((a) => `${a.user}|${a.lesson}`))

  const students = input.students.map((student) => {
    const records = summarizeRecords(input.progressDocs.filter((d) => d.user === student.id))
    const lessons: Record<string, StudentLessonProgress> = {}

    for (const lesson of input.lessons) {
      const record = records.get(lesson.id)
      const attempted = lessonsWithAttempts.has(`${student.id}|${lesson.id}`)
      if (!record && !attempted) continue // never started → omitted

      const status = maxStatus(record?.status ?? null, attempted ? 'in_progress' : null)
      lessons[lesson.id] = {
        status: status ?? 'in_progress',
        minutes: Math.round((record?.seconds ?? 0) / 6) / 10,
        questions: lesson.questions.map(({ exerciseId, blockId }) => {
          const key = questionKey(exerciseId, blockId)
          return questionProgress(key, attemptsByKey.get(`${student.id}|${key}`))
        }),
      }
    }
    return { id: student.id, name: student.name, lessons }
  })

  return {
    class: { id: input.classId, name: input.className },
    lessons: input.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      questionCount: l.questions.length,
    })),
    students,
  }
}
