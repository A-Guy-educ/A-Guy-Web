import { describe, it, expect } from 'vitest'
import {
  getProofBlankKeys,
  gradeProofAnswer,
  isProofBlankCell,
} from '@/ui/web/exerciserenderer/questions/ProofQuestion/proofCells'
import { validateTableAnswers } from '@/ui/web/exerciserenderer/utils/tableValidation'
import {
  checkQuestionAnswer,
  getInitialAnswer,
} from '@/ui/web/exerciserenderer/utils/answerChecking'
import type { UserAnswer } from '@/ui/web/exerciserenderer/types'
import { proofCommonSideAbcAdc, proofSasKlmXyz } from './fixtures/questionProofDemo'

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

const tableAnswer = (cellValues: Record<string, string>): UserAnswer => ({
  type: 'table',
  cellValues,
})

describe('question_proof blank-cell detection', () => {
  it('finds the single blank reason in each demo exercise', () => {
    expect(getProofBlankKeys(proofSasKlmXyz.table)).toEqual(['3-1'])
    expect(getProofBlankKeys(proofCommonSideAbcAdc.table)).toEqual(['2-1'])
  })

  it('treats filled cells as display cells', () => {
    expect(isProofBlankCell(proofSasKlmXyz.table, 0, 0)).toBe(false)
    expect(isProofBlankCell(proofSasKlmXyz.table, 3, 0)).toBe(false)
  })

  it('treats an empty cell without options as a display cell, not a blank', () => {
    const table = { ...proofSasKlmXyz.table, rowsData: [['', 'נתון']], options: {} }
    expect(isProofBlankCell(table, 0, 0)).toBe(false)
  })

  it('treats an empty cell with an empty options list as a display cell', () => {
    const table = { ...proofSasKlmXyz.table, rowsData: [['', 'נתון']], options: { '0-0': [] } }
    expect(isProofBlankCell(table, 0, 0)).toBe(false)
  })

  it('detects a blank in the claim column', () => {
    const table = {
      ...proofSasKlmXyz.table,
      rowsData: [['', 'נתון']],
      options: { '0-0': ['$KL = XY$', '$KL = YZ$'] },
    }
    expect(isProofBlankCell(table, 0, 0)).toBe(true)
  })

  it('returns false for out-of-range cells', () => {
    expect(isProofBlankCell(proofSasKlmXyz.table, 9, 1)).toBe(false)
  })
})

describe('question_proof grading through validateTableAnswers', () => {
  it('accepts the correct option text', () => {
    const { allCorrect, cellResults } = validateTableAnswers(
      { '3-1': 'לפי צ–ז–צ' },
      proofSasKlmXyz.table.answers,
    )
    expect(allCorrect).toBe(true)
    expect(cellResults).toEqual([{ key: '3-1', isCorrect: true }])
  })

  it('rejects a wrong option and marks that cell', () => {
    const { allCorrect, cellResults } = gradeProofAnswer(proofCommonSideAbcAdc.table, {
      '2-1': 'זוויות קודקודיות',
    })
    expect(allCorrect).toBe(false)
    expect(cellResults).toEqual([{ key: '2-1', isCorrect: false }])
  })

  it('rejects an unanswered blank', () => {
    expect(gradeProofAnswer(proofSasKlmXyz.table, {}).allCorrect).toBe(false)
  })

  it('every authored answer is one of its options', () => {
    for (const block of [proofSasKlmXyz, proofCommonSideAbcAdc]) {
      for (const [key, answer] of Object.entries(block.table.answers)) {
        expect(block.table.options[key]).toContain(answer)
      }
    }
  })
})

describe('question_proof in checkQuestionAnswer (batch check)', () => {
  it('starts with an empty table answer', () => {
    expect(getInitialAnswer(proofSasKlmXyz)).toEqual({ type: 'table', cellValues: {} })
  })

  it('grades correct and wrong choices', async () => {
    const correct = await checkQuestionAnswer(
      proofCommonSideAbcAdc,
      tableAnswer({ '2-1': 'צלע משותפת' }),
      MESSAGES,
    )
    const wrong = await checkQuestionAnswer(
      proofCommonSideAbcAdc,
      tableAnswer({ '2-1': 'נתון' }),
      MESSAGES,
    )
    expect(correct.isCorrect).toBe(true)
    expect(wrong.isCorrect).toBe(false)
  })

  it('rejects a non-table answer shape', async () => {
    const result = await checkQuestionAnswer(
      proofSasKlmXyz,
      { type: 'free_response', value: 'לפי צ–ז–צ' },
      MESSAGES,
    )
    expect(result).toEqual({ isCorrect: false, message: MESSAGES.invalidAnswerType })
  })
})
