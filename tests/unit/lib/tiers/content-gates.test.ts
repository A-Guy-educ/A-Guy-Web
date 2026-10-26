/**
 * @fileType unit-test
 * @domain billing
 * @pattern tier-content-gates
 * @ai-summary Locks the free-tier "first 3 opened lessons per type" counter (TIERS.md): lessons 3/17/29 open, the 4th distinct one locks, already-opened lessons stay open, exams lock basic too, and each kill switch (learning vs practice/exam) makes its gates permissive.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canAccessExam,
  canAccessLearningExercise,
  canAccessPracticeLesson,
  clampToLearningExerciseGate,
  getLearningLessonOpenOrdinal,
} from '@/lib/tiers'

const free = { currentTier: 'free' }
const basic = { currentTier: 'basic' }
const advanced = { currentTier: 'advanced' }

describe('content gates — enforcement on', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', 'on'))
  afterEach(() => vi.unstubAllEnvs())

  it('lets a free user open any 3 practice lessons regardless of course position', () => {
    expect(canAccessPracticeLesson(free, 'p3', [])).toBe(true)
    expect(canAccessPracticeLesson(free, 'p17', ['p3'])).toBe(true)
    expect(canAccessPracticeLesson(free, 'p29', ['p3', 'p17'])).toBe(true)
  })

  it('locks the 4th distinct practice lesson but keeps the opened ones open', () => {
    const opened = ['p3', 'p17', 'p29']
    expect(canAccessPracticeLesson(free, 'p1', opened)).toBe(false)
    expect(canAccessPracticeLesson(free, 'p17', opened)).toBe(true)
  })

  it('keeps every legacy-opened lesson open even past 3', () => {
    expect(canAccessPracticeLesson(free, 'p5', ['p1', 'p2', 'p3', 'p4', 'p5'])).toBe(true)
  })

  it('unlocks all practice lessons for basic+', () => {
    expect(canAccessPracticeLesson(basic, 'p9', ['p1', 'p2', 'p3'])).toBe(true)
  })

  it('counts exams for free and basic, unlocks them for advanced+', () => {
    const opened = ['e1', 'e2', 'e3']
    expect(canAccessExam(free, 'e4', opened)).toBe(false)
    expect(canAccessExam(basic, 'e4', opened)).toBe(false)
    expect(canAccessExam(basic, 'e2', opened)).toBe(true)
    expect(canAccessExam(advanced, 'e4', opened)).toBe(true)
  })

  it('caps exercises only in learning lessons outside the first 3 opened', () => {
    const opened = ['l3', 'l17', 'l29', 'l2']
    const ordinal = (id: string) => getLearningLessonOpenOrdinal(id, opened)
    expect(canAccessLearningExercise(free, ordinal('l29'), 10)).toBe(true)
    expect(canAccessLearningExercise(free, ordinal('l2'), 3)).toBe(true)
    expect(canAccessLearningExercise(free, ordinal('l2'), 4)).toBe(false)
    expect(canAccessLearningExercise(basic, ordinal('l2'), 4)).toBe(true)
  })

  it('clamps a learning lesson to its first 3 exercises from the 4th opened lesson', () => {
    const exercises = ['e1', 'e2', 'e3', 'e4', 'e5']
    expect(clampToLearningExerciseGate(free, 4, exercises)).toEqual(['e1', 'e2', 'e3'])
    expect(clampToLearningExerciseGate(free, 3, exercises)).toBe(exercises)
    expect(clampToLearningExerciseGate(basic, 4, exercises)).toBe(exercises)
    expect(clampToLearningExerciseGate(free, null, exercises)).toBe(exercises)
  })
})

describe('getLearningLessonOpenOrdinal', () => {
  it('returns the 1-based opened position, or the next slot when not opened yet', () => {
    expect(getLearningLessonOpenOrdinal('b', ['a', 'b'])).toBe(2)
    expect(getLearningLessonOpenOrdinal('z', ['a', 'b'])).toBe(3)
    expect(getLearningLessonOpenOrdinal('z', [])).toBe(1)
  })
})

describe('content gates — kill switch off', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('allows everything', () => {
    vi.stubEnv('NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED', '')
    const opened = ['x1', 'x2', 'x3']
    expect(canAccessPracticeLesson(free, 'x4', opened)).toBe(true)
    expect(canAccessExam(free, 'x4', opened)).toBe(true)
    expect(canAccessLearningExercise(free, 99, 99)).toBe(true)
  })
})

describe('content gates — learning locks on, practice/exam locks off', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_TIER_LEARNING_LOCKS_ENABLED', 'true')
    vi.stubEnv('NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED', 'false')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('caps learning exercises from the 4th opened lesson but leaves practice and exams open', () => {
    const opened = ['x1', 'x2', 'x3']
    expect(canAccessLearningExercise(free, 3, 4)).toBe(true)
    expect(canAccessLearningExercise(free, 4, 3)).toBe(true)
    expect(canAccessLearningExercise(free, 4, 4)).toBe(false)
    expect(canAccessPracticeLesson(free, 'x4', opened)).toBe(true)
    expect(canAccessExam(free, 'x4', opened)).toBe(true)
  })
})

describe('content gates — practice/exam locks on, learning locks off', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_TIER_LEARNING_LOCKS_ENABLED', 'false')
    vi.stubEnv('NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED', 'true')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('locks the 4th practice lesson and exam but not learning exercises', () => {
    const opened = ['x1', 'x2', 'x3']
    expect(canAccessLearningExercise(free, 4, 4)).toBe(true)
    expect(canAccessPracticeLesson(free, 'x4', opened)).toBe(false)
    expect(canAccessExam(free, 'x4', opened)).toBe(false)
  })
})
