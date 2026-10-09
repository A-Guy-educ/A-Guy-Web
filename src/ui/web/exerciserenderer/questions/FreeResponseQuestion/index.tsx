/**
 * Free Response Question Component — WYSIWYG answer input.
 *
 * Students type a sentence or two with math atoms (fractions, powers, roots)
 * rendered inline as atomic chips. Formula button toggles a quick-insert
 * toolbar that creates a chip via `mathInputRef.current.insert(latex)`.
 */

'use client'

import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MathPicker } from '@/ui/web/shared/MathInput/MathPicker'
import { MixedMathInput, type MixedMathInputRef } from '@/ui/web/shared/MathInput/MixedMathInput'
import { Sigma } from 'lucide-react'
import type { QuestionFreeResponseBlock, UserAnswer, CheckResult, RichTextBlock } from '../../types'
import { RichTextRenderer } from '../../blocks/RichTextRenderer'

interface FreeResponseQuestionProps {
  question: QuestionFreeResponseBlock
  answer: UserAnswer
  onChange: (answer: UserAnswer) => void
  disabled: boolean
  checkResult: CheckResult | null
  t: (key: string) => string
  showMathTools?: boolean
}

export function FreeResponseQuestion({
  question,
  answer,
  onChange,
  disabled,
  checkResult: _checkResult,
  t,
  showMathTools = true,
}: FreeResponseQuestionProps) {
  const value = answer?.type === 'free_response' ? answer.value : ''
  const mathInputRef = useRef<MixedMathInputRef>(null)
  const [toolbarOpen, setToolbarOpen] = useState(false)

  const promptBlock: RichTextBlock = {
    ...question.prompt,
    id: `${question.id}-prompt`,
    mediaIds: question.prompt.mediaIds || [],
  }

  const handleChange = (markdown: string) => {
    onChange({ type: 'free_response', value: markdown })
  }

  const handleInsertMath = useCallback((latex: string) => {
    mathInputRef.current?.insert(latex)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border/40 bg-background/60 dark:bg-card dark:border-border/60 dark:shadow-card p-content-gap">
        <div
          className="w-8 h-1 rounded-full mb-3"
          style={{ backgroundColor: 'hsl(var(--tab-ask))' }}
        />
        <div className="text-body-md font-medium text-foreground leading-relaxed">
          <RichTextRenderer block={promptBlock} />
        </div>
      </div>

      <div className="relative" data-math-controls>
        <div className="relative rounded-xl border-2 border-[hsl(var(--tab-ask)/0.3)] bg-[hsl(var(--tab-ask)/0.04)] dark:border-[hsl(var(--tab-ask)/0.4)] dark:shadow-card min-h-[76px] px-3 py-2 pe-14">
          <MixedMathInput
            ref={mathInputRef}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={t('enterAnswer')}
          />

          {showMathTools && !disabled && (
            <button
              type="button"
              onClick={() => setToolbarOpen((v) => !v)}
              className="absolute end-1.5 top-2 flex items-center gap-1 px-3 py-1.5 rounded-full bg-[hsl(var(--tab-ask))] text-white shadow-card hover:shadow-card-hover transition-all duration-normal z-10 text-body-xs font-semibold"
              title={t('insertFormula')}
            >
              <Sigma className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {toolbarOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 start-0 end-0 z-20 rounded-lg border border-border bg-card shadow-card p-2"
            >
              <MathPicker onInsert={handleInsertMath} onClose={() => setToolbarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
