/**
 * Proof Table - Pure Renderer
 * Two-column claim / reason table. Filled cells render through MathMarkdown;
 * blank cells render a dropdown with per-cell feedback after checking.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/infra/utils/ui'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'
import type { ProofTable as ProofTableData, TableCellResult } from '../../types'
import { ProofCellSelect } from './ProofCellSelect'
import { CLAIM_COLUMN, PROOF_HEADERS, isProofBlankCell, proofCellKey } from './proofCells'

interface ProofTableProps {
  table: ProofTableData
  cellValues: Record<string, string>
  onCellChange: (key: string, value: string) => void
  cellResults: TableCellResult[]
  disabled: boolean
  t: (key: string) => string
}

export function ProofTable({
  table,
  cellValues,
  onCellChange,
  cellResults,
  disabled,
  t,
}: ProofTableProps) {
  const resultMap = Object.fromEntries(cellResults.map((r) => [r.key, r.isCorrect]))
  const headers = table.headers?.length === 2 ? table.headers : PROOF_HEADERS
  const lastRow = table.rowsData.length - 1

  return (
    <div
      dir="rtl"
      className="w-full overflow-hidden rounded-xl border border-border/40 bg-background/60 dark:bg-card dark:shadow-card"
    >
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr>
            {headers.map((header, ci) => (
              <th
                key={ci}
                className={cn(
                  'p-3 text-start font-bold text-body-sm text-muted-foreground bg-muted/30 border-b border-border/40',
                  ci === CLAIM_COLUMN ? 'w-[56%]' : 'border-s border-border/40',
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rowsData.map((row, ri) => (
            <motion.tr
              key={ri}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: ri * 0.03 }}
              // The concluding row (what the proof sets out to show) is tinted.
              className={cn(ri === lastRow && 'bg-[hsl(var(--tab-learn)/0.04)]')}
            >
              {row.map((cell, ci) => {
                const key = proofCellKey(ri, ci)
                const result = resultMap[key]
                return (
                  <td
                    key={ci}
                    className={cn(
                      'p-3 text-start align-middle text-body-sm border-t border-border/30',
                      ci !== CLAIM_COLUMN && 'border-s',
                    )}
                  >
                    {isProofBlankCell(table, ri, ci) ? (
                      <ProofCellSelect
                        cellKey={key}
                        options={table.options[key]}
                        value={cellValues[key] ?? ''}
                        placeholder={t(
                          ci === CLAIM_COLUMN ? 'proofChooseClaim' : 'proofChooseReason',
                        )}
                        ariaLabel={t(
                          ci === CLAIM_COLUMN ? 'proofChooseClaim' : 'proofChooseReason',
                        )}
                        onChange={onCellChange}
                        result={result}
                        disabled={disabled || result === true}
                      />
                    ) : cell === '' ? (
                      <span className="block min-h-[1.5em]" />
                    ) : (
                      <MathMarkdown content={cell} />
                    )}
                  </td>
                )
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
