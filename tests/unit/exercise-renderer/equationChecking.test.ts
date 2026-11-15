import { describe, it, expect } from 'vitest'
import type { QuestionEquationBlock } from '@/infra/types/exercise'
import {
  checkQuestionAnswer,
  getInitialAnswer,
  isAutoGradedAnswer,
} from '@/ui/web/exerciserenderer/utils/answerChecking'
import { isClientGradedSubmission } from '@/ui/web/exerciserenderer/utils/questionAttemptReporter'
import {
  formatEquationAnswer,
  readEquationOperations,
} from '@/ui/web/exerciserenderer/utils/equationAnswer'
import type { EquationOperation } from '@/infra/types/linearEquation'

const MESSAGES = {
  invalidAnswerType: 'Invalid answer type',
  selectTrueFalse: 'Select true/false',
  noCorrectAnswer: 'No correct answer',
  selectAnAnswer: 'Select an answer',
  enterAnAnswer: 'Enter an answer',
  unknownVariant: 'Unknown variant',
  validationFailed: 'Validation failed',
  validationError: 'Validation error',
  connectionError: 'Connection error',
}

const block: QuestionEquationBlock = {
  id: 'q1',
  type: 'question_equation',
  prompt: { type: 'rich_text', format: 'md-math-v1', value: '', mediaIds: [] },
  equation: { left: '2x + 3', right: 'x + 8' },
  steps: [
    {
      id: 's1',
      options: [
        { id: 'o1', label: '-3' },
        { id: 'o2', label: '-x' },
      ],
      correctOptionId: 'o2',
      result: { left: 'x + 3', right: '8' },
    },
    {
      id: 's2',
      options: [
        { id: 'o1', label: '+3' },
        { id: 'o2', label: '-3' },
      ],
      correctOptionId: 'o2',
      result: { left: 'x', right: '5' },
    },
  ],
}

const answerAt = (completedSteps: number) => ({ type: 'equation' as const, completedSteps })

describe('equation answer checking', () => {
  it('starts with no completed steps', () => {
    expect(getInitialAnswer(block)).toEqual(answerAt(0))
  })

  it('is correct only once every step is done', async () => {
    expect((await checkQuestionAnswer(block, answerAt(2), MESSAGES)).isCorrect).toBe(true)
    expect((await checkQuestionAnswer(block, answerAt(1), MESSAGES)).isCorrect).toBe(false)
  })

  it('asks for an answer when no step was done', async () => {
    const result = await checkQuestionAnswer(block, answerAt(0), MESSAGES)
    expect(result).toEqual({ isCorrect: false, message: MESSAGES.selectAnAnswer })
  })

  it('auto-grades only the final step', () => {
    expect(isAutoGradedAnswer(block, answerAt(1))).toBe(false)
    expect(isAutoGradedAnswer(block, answerAt(2))).toBe(true)
  })

  it('only records a verdict once a step was done', () => {
    expect(isClientGradedSubmission(block, answerAt(0))).toBe(false)
    expect(isClientGradedSubmission(block, answerAt(1))).toBe(true)
  })
})

describe('dynamic mode', () => {
  const dynamic: QuestionEquationBlock = {
    ...block,
    mode: 'dynamic',
    steps: [],
    linear: { a: 2, b: 3, c: 1, d: 8 },
  }
  const answerWith = (operations: EquationOperation[]) => ({
    type: 'equation' as const,
    completedSteps: operations.length,
    operations,
  })
  const minusX: EquationOperation = { kind: 'add_x', value: { n: -1, d: 1 } }
  const minus3: EquationOperation = { kind: 'add_number', value: { n: -3, d: 1 } }
  const plus4: EquationOperation = { kind: 'add_number', value: { n: 4, d: 1 } }

  it('is correct once the chosen operations isolate x, detours included', async () => {
    const solved = await checkQuestionAnswer(
      dynamic,
      answerWith([plus4, minusX, minus3, { kind: 'add_number', value: { n: -4, d: 1 } }]),
      MESSAGES,
    )
    const partial = await checkQuestionAnswer(dynamic, answerWith([minusX]), MESSAGES)
    expect(solved.isCorrect).toBe(true)
    expect(partial.isCorrect).toBe(false)
    expect(isAutoGradedAnswer(dynamic, answerWith([minusX, minus3]))).toBe(true)
    expect(isAutoGradedAnswer(dynamic, answerWith([minusX]))).toBe(false)
  })

  it('treats a saved answer without operations as no moves', async () => {
    const legacy = await checkQuestionAnswer(dynamic, answerAt(2), MESSAGES)
    expect(legacy.isCorrect).toBe(false)
  })

  it('ignores a malformed operations list instead of throwing', () => {
    const divideByZero = { kind: 'divide', value: { n: 0, d: 1 } } as EquationOperation
    const unknownKind = { kind: 'multiply', value: { n: 2, d: 1 } } as unknown as EquationOperation
    const badFraction = { kind: 'add_x', value: { n: 1.5, d: 0 } } as EquationOperation
    for (const bad of [divideByZero, unknownKind, badFraction]) {
      expect(readEquationOperations(answerWith([minusX, bad]))).toEqual([])
      expect(() => isAutoGradedAnswer(dynamic, answerWith([minusX, bad]))).not.toThrow()
    }
  })

  it('summarises moves for the chat', () => {
    expect(formatEquationAnswer(dynamic, answerWith([minusX]))).toBe('1 moves: -x')
    expect(formatEquationAnswer(dynamic, answerWith([minusX, minus3]))).toBe(
      '2 moves: -x, -3, solved',
    )
    expect(formatEquationAnswer(block, answerAt(1))).toBe('1/2 steps')
  })
})
