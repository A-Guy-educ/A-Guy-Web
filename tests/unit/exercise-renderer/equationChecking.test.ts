import { describe, it, expect } from 'vitest'
import type { QuestionEquationBlock } from '@/infra/types/exercise'
import {
  checkQuestionAnswer,
  getInitialAnswer,
  isAutoGradedAnswer,
} from '@/ui/web/exerciserenderer/utils/answerChecking'
import { isClientGradedSubmission } from '@/ui/web/exerciserenderer/utils/questionAttemptReporter'

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
