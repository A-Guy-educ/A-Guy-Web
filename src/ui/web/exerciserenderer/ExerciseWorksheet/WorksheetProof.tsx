/**
 * Worksheet (scroll / PDF) rendering of a `question_proof` block: prompt,
 * the "נתון" box, and the claim / reason table. Blank cells list their
 * choices so a printed sheet can still be answered. The diagram is handled
 * by the worksheet's generic attachment wrapper.
 */

'use client'

import React from 'react'
import { cn } from '@/infra/utils/ui'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'
import { RichTextRenderer } from '../blocks/RichTextRenderer'
import type { InlineRichText, QuestionProofBlock, RichTextBlock } from '../types'
import {
  CLAIM_COLUMN,
  PROOF_HEADERS,
  isProofBlankCell,
  proofCellKey,
} from '../questions/ProofQuestion/proofCells'

/** Mirrors `WORKSHEET_LINE_HEIGHT` in ./index.tsx (not imported to avoid a cycle). */
const LINE_HEIGHT = 'leading-[2.25]'

function WorksheetRichText({ id, content }: { id: string; content: InlineRichText }) {
  const block: RichTextBlock = { ...content, id, mediaIds: content.mediaIds ?? [] }
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none text-foreground leading-relaxed">
      <RichTextRenderer block={block} lineHeightClassName={LINE_HEIGHT} />
    </div>
  )
}

export function WorksheetProof({ block }: { block: QuestionProofBlock }) {
  const { table } = block
  const headers = table.headers?.length === 2 ? table.headers : PROOF_HEADERS
  const cellBase = 'border border-foreground/40 px-3 py-2 text-start align-top'

  return (
    <div className="flex flex-col gap-content-gap-xs">
      {block.prompt?.value?.trim() && (
        <WorksheetRichText id={`${block.id}-prompt`} content={block.prompt} />
      )}
      {block.given?.value?.trim() && (
        <div className="rounded border border-foreground/30 px-3 py-2">
          <WorksheetRichText id={`${block.id}-given`} content={block.given} />
        </div>
      )}
      <table className="w-full table-fixed border-collapse text-body-sm" dir="rtl">
        <thead>
          <tr>
            {headers.map((h, ci) => (
              <th
                key={ci}
                className={cn(cellBase, 'bg-muted font-semibold', ci === CLAIM_COLUMN && 'w-[56%]')}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rowsData.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={cellBase}>
                  {isProofBlankCell(table, ri, ci) ? (
                    <ul className="flex flex-col gap-1 list-none text-muted-foreground">
                      {table.options[proofCellKey(ri, ci)].map((option) => (
                        <li key={option} className="flex items-baseline gap-content-gap-xs">
                          <span aria-hidden>☐</span>
                          <MathMarkdown content={option} />
                        </li>
                      ))}
                    </ul>
                  ) : cell ? (
                    <MathMarkdown content={cell} />
                  ) : (
                    <span className="block min-h-[1.5em]" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
