/**
 * Proof Question Component
 * Geometry proof table (טענה / נימוק) where the student picks the missing
 * claims/reasons from dropdowns. Grading reuses the table answer shape and
 * validateTableAnswers. Per-cell feedback is managed internally; the overall
 * result flows to the parent via callback, same as TableQuestion.
 *
 * Layout: the diagram sits beside the table (≈38%), top-aligned with the
 * table's top border. It's a container query, not a viewport breakpoint, so
 * the narrow chat bubble stacks like a phone does: prompt, given, diagram,
 * table, actions.
 */

'use client'

import React, { useState, useCallback, useMemo, type ReactNode } from 'react'
import type { QuestionProofBlock, UserAnswer, RichTextBlock, TableCellResult } from '../../types'
import { RichTextRenderer } from '../../blocks/RichTextRenderer'
import { Button } from '@/ui/web/components/button'
import { cn } from '@/infra/utils/ui'
import { CheckCircle2 } from 'lucide-react'
import { ProofTable } from './ProofTable'
import { getProofBlankKeys, gradeProofAnswer } from './proofCells'

interface ProofQuestionProps {
  question: QuestionProofBlock
  answer: UserAnswer
  onChange: (answer: UserAnswer) => void
  checked: boolean
  allCorrect: boolean
  onCheckResult: (isCorrect: boolean) => void
  t: (key: string) => string
  /** Rendered diagram (from 'renderQuestionAttachment'), placed beside the table. */
  attachment?: ReactNode
}

export function ProofQuestion({
  question,
  answer,
  onChange,
  checked,
  allCorrect,
  onCheckResult,
  t,
  attachment,
}: ProofQuestionProps) {
  const [cellResults, setCellResults] = useState<TableCellResult[]>([])
  const EMPTY_CELLS: Record<string, string> = useMemo(() => ({}), [])
  const cellValues = answer.type === 'table' ? answer.cellValues : EMPTY_CELLS
  const hasBlanks = useMemo(() => getProofBlankKeys(question.table).length > 0, [question.table])

  const handleCellChange = useCallback(
    (key: string, value: string) => {
      onChange({ type: 'table', cellValues: { ...cellValues, [key]: value } })
      // A new choice invalidates that cell's old verdict.
      setCellResults((prev) => prev.filter((r) => r.key !== key))
    },
    [cellValues, onChange],
  )

  const handleCheck = useCallback(() => {
    const { cellResults: results, allCorrect: correct } = gradeProofAnswer(
      question.table,
      cellValues,
    )
    setCellResults(results)
    onCheckResult(correct)
  }, [cellValues, question.table, onCheckResult])

  const toRichTextBlock = (suffix: string, rt: QuestionProofBlock['prompt']): RichTextBlock => ({
    ...rt,
    id: `${question.id}-${suffix}`,
    mediaIds: rt.mediaIds || [],
  })

  const hasDiagram = !!attachment

  return (
    <div className="@container w-full">
      <div
        className={cn(
          'grid grid-cols-1 gap-y-content-gap',
          hasDiagram &&
            '@min-[600px]:grid-cols-[minmax(0,1fr)_minmax(15rem,38%)] @min-[600px]:grid-rows-[auto_auto_auto_1fr] @min-[600px]:gap-x-8 @min-[600px]:gap-y-0',
        )}
      >
        {/* Prompt + given */}
        <div
          className={cn(
            'flex flex-col gap-content-gap min-w-0',
            hasDiagram && '@min-[600px]:col-start-1 @min-[600px]:row-start-1',
          )}
        >
          <div className="rounded-2xl border border-border/40 bg-background/60 dark:bg-card dark:border-border/60 dark:shadow-card p-content-gap">
            <div
              className="w-8 h-1 rounded-full mb-3"
              style={{ backgroundColor: 'hsl(var(--tab-learn))' }}
            />
            <div className="text-body-md font-medium text-foreground leading-relaxed">
              <RichTextRenderer block={toRichTextBlock('prompt', question.prompt)} />
            </div>
          </div>

          {question.given?.value && (
            <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
              <div className="mb-2 text-body-xs font-bold text-muted-foreground">
                {t('proofGiven')}
              </div>
              <div className="text-body-md text-foreground">
                <RichTextRenderer block={toRichTextBlock('given', question.given)} />
              </div>
            </div>
          )}
        </div>

        {/* Diagram — beside the table on wide containers, above it on narrow ones */}
        {hasDiagram && (
          <figure
            className={cn(
              'm-0 min-w-0 w-full max-w-[26rem] justify-self-center self-start',
              '@min-[600px]:col-start-2 @min-[600px]:row-start-2 @min-[600px]:row-span-3 @min-[600px]:mt-content-gap @min-[600px]:max-w-none',
            )}
          >
            {attachment}
          </figure>
        )}

        <div
          className={cn(
            'min-w-0',
            hasDiagram &&
              '@min-[600px]:col-start-1 @min-[600px]:row-start-2 @min-[600px]:mt-content-gap',
          )}
        >
          <ProofTable
            table={question.table}
            cellValues={cellValues}
            onCellChange={handleCellChange}
            cellResults={cellResults}
            disabled={allCorrect}
            t={t}
          />
        </div>

        {hasBlanks && (
          <div
            className={cn(
              'flex justify-end',
              hasDiagram &&
                '@min-[600px]:col-start-1 @min-[600px]:row-start-3 @min-[600px]:mt-content-gap',
            )}
          >
            <Button
              onClick={handleCheck}
              disabled={allCorrect}
              size="lg"
              className={cn(
                'rounded-xl font-bold text-body-md',
                allCorrect && 'bg-success hover:bg-success/90 text-white',
              )}
            >
              {allCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {t('correct')}
                </>
              ) : checked ? (
                t('tryAgain')
              ) : (
                t('checkAnswer')
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
