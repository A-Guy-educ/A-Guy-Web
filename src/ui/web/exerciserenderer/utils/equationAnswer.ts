/**
 * Equation answers: reading saved dynamic-mode operations, deciding when the
 * equation is solved, and a one-line summary for the AI chat.
 */
import {
  applyOperations,
  getSolution,
  operationLatex,
  type EquationOperation,
} from '@/infra/types/linearEquation'
import type { QuestionEquationBlock, UserAnswer } from '../types'

type EquationAnswer = Extract<UserAnswer, { type: 'equation' }>

const OPERATION_KINDS: ReadonlySet<string> = new Set(['add_number', 'add_x', 'divide'])

function isOperation(value: unknown): value is EquationOperation {
  if (typeof value !== 'object' || value === null) return false
  const { kind, value: fraction } = value as {
    kind?: unknown
    value?: { n?: unknown; d?: unknown }
  }
  if (typeof kind !== 'string' || !OPERATION_KINDS.has(kind)) return false
  const n = fraction?.n
  const d = fraction?.d
  if (!Number.isInteger(n) || !Number.isInteger(d) || (d as number) <= 0) return false
  // The engine throws on a zero divisor.
  return !(kind === 'divide' && n === 0)
}

/**
 * The dynamic-mode operations in a saved answer. Answers come back from
 * browser storage unvalidated, so a malformed list counts as no moves rather
 * than crashing the replay; answers saved before dynamic mode have none.
 */
export function readEquationOperations(answer: UserAnswer): EquationOperation[] {
  if (answer.type !== 'equation' || !Array.isArray(answer.operations)) return []
  return answer.operations.every(isOperation) ? answer.operations : []
}

/**
 * Steps mode: every authored step is done. Dynamic mode: the chosen
 * operations leave x alone on one side.
 */
export function isEquationSolved(question: QuestionEquationBlock, answer: EquationAnswer): boolean {
  if (question.mode !== 'dynamic') return answer.completedSteps >= question.steps.length
  if (!question.linear) return false
  return getSolution(applyOperations(question.linear, readEquationOperations(answer))) !== null
}

export function formatEquationAnswer(
  question: QuestionEquationBlock,
  answer: EquationAnswer,
): string {
  if (question.mode !== 'dynamic') {
    return `${answer.completedSteps}/${question.steps.length} steps`
  }
  const operations = readEquationOperations(answer)
  const moves = operations.map(operationLatex).join(', ')
  const solved = isEquationSolved(question, answer) ? ', solved' : ''
  return `${operations.length} moves${moves && `: ${moves}`}${solved}`
}
