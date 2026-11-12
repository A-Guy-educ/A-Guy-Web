import { describe, expect, it } from 'vitest'

import type { Exercise } from '@/infra/types/content'
import { buildLessonLanding } from '@/lib/lessons/buildLessonLanding'

const rich = (value: string) => ({ type: 'rich_text', format: 'md-math-v1', value, mediaIds: [] })

function mcq(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: 'question_select',
    variant: 'mcq',
    selectionMode: 'single',
    prompt: rich(`**א.** question ${id}`),
    answer: {
      multiSelect: false,
      options: [
        { id: 'opt-1', content: rich('wrong') },
        { id: 'opt-2', content: rich(`right ${id}`) },
      ],
      correctOptionIds: ['opt-2'],
    },
    ...extra,
  }
}

function exercise(id: string, blocks: unknown[], difficulty?: string): Exercise {
  return { id, slug: id, title: `Exercise ${id}`, difficulty, content: { blocks } } as Exercise
}

describe('buildLessonLanding', () => {
  it('returns empty content for a lesson without exercises', () => {
    expect(buildLessonLanding([])).toEqual({ visual: null, workedExample: null, practice: [] })
  })

  it('uses the first MCQ with a full solution as the worked example', () => {
    const { workedExample } = buildLessonLanding([
      exercise('1', [mcq('a')]),
      exercise('2', [mcq('b', { fullSolution: rich('step 1\n\nstep 2') })]),
    ])

    expect(workedExample).toEqual({
      exerciseTitle: 'Exercise 2',
      prompt: 'question b',
      solution: 'step 1\n\nstep 2',
      answer: 'right b',
    })
  })

  it('never reuses the worked example as a practice question', () => {
    const { practice } = buildLessonLanding([
      exercise('1', [mcq('a', { fullSolution: rich('sol') }), mcq('b')]),
    ])

    expect(practice.map((q) => q.id)).toEqual(['b'])
  })

  it('takes one question per exercise spread from first to last', () => {
    const exercises = ['1', '2', '3', '4', '5'].map((id) =>
      exercise(id, [mcq(`q${id}`, { hint: rich(`hint ${id}`) })], `level ${id}`),
    )

    const { practice } = buildLessonLanding(exercises)

    expect(practice.map((q) => q.id)).toEqual(['q1', 'q3', 'q5'])
    expect(practice[0]).toMatchObject({
      prompt: 'question q1',
      correctOptionId: 'opt-2',
      hint: 'hint 1',
      level: 'level 1',
    })
  })

  it('skips multi-answer and malformed questions', () => {
    const multi = mcq('multi')
    multi.answer.correctOptionIds = ['opt-1', 'opt-2']
    const { practice } = buildLessonLanding([
      exercise('1', [multi, { id: 'broken', type: 'question_select', variant: 'mcq' }]),
    ])

    expect(practice).toEqual([])
  })

  it('picks the first non-interactive sketch as the visual', () => {
    const interactive = { id: 's1', type: 'svg', value: '<svg/>', interactive: true }
    const axis = { id: 'ax', type: 'question_axis', axis: { functions: [] } }

    const { visual } = buildLessonLanding([exercise('1', [interactive, axis])])

    expect(visual).toBe(axis)
  })
})
