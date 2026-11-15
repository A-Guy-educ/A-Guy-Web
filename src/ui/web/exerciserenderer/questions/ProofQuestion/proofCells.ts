/**
 * Proof Table Cells
 * Pure helpers for `question_proof`: which cells are blanks the student fills
 * from a dropdown, and grading through the shared table validator.
 */

import type { ProofTable, TableCellResult } from '../../types'
import { validateTableAnswers } from '../../utils/tableValidation'

/** Column headers used when the block omits them (claim / reason). */
export const PROOF_HEADERS = ['טענה', 'נימוק'] as const

/** Column index of the claim (טענה) column; the other column is the reason. */
export const CLAIM_COLUMN = 0

export function proofCellKey(rowIdx: number, colIdx: number): string {
  return `${rowIdx}-${colIdx}`
}

/**
 * A cell is a blank when its text is empty AND the author gave it choices.
 * An empty cell without options is just an empty display cell.
 */
export function isProofBlankCell(table: ProofTable, rowIdx: number, colIdx: number): boolean {
  if (table.rowsData[rowIdx]?.[colIdx] !== '') return false
  const choices = table.options?.[proofCellKey(rowIdx, colIdx)]
  return Array.isArray(choices) && choices.length > 0
}

/** Keys (`"r-c"`) of every blank cell, in row-major order. */
export function getProofBlankKeys(table: ProofTable): string[] {
  return table.rowsData.flatMap((row, ri) =>
    row.flatMap((_, ci) => (isProofBlankCell(table, ri, ci) ? [proofCellKey(ri, ci)] : [])),
  )
}

/** Grade the chosen option texts against the answer key (exact match per key). */
export function gradeProofAnswer(
  table: ProofTable,
  cellValues: Record<string, string>,
): { cellResults: TableCellResult[]; allCorrect: boolean } {
  return validateTableAnswers(cellValues, table.answers ?? {})
}
