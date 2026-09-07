'use client'

import { cn } from '@/infra/utils/ui'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { QuestionNotebook } from '@/ui/web/exerciserenderer/components/QuestionNotebook'
import type { QuestionFreeResponseBlock } from '@/ui/web/exerciserenderer/types'
import { FormulaComposer } from '@/ui/web/shared/MathInput/FormulaComposer'
import { useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { FunctionSquare, Send } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

interface ChatFreeResponseBubbleProps {
  block: QuestionFreeResponseBlock
  questionLabel?: string
  placeholder: string
  sendLabel: string
  /**
   * Locks the input regardless of local submit state. Used to freeze
   * scroll-back bubbles + to prevent submitting while a chat request is in
   * flight (otherwise the resulting requestCorrection would be silently
   * dropped by useChatChannel's sendingRef early-return).
   */
  disabled?: boolean
  onSubmit: (blockId: string, text: string, isCorrect: boolean) => void
}

/**
 * Chat-native renderer for `question_free_response` blocks. Text input +
 * submit button matching ChatInputPanel's visual language. Grades locally by
 * comparing the trimmed / whitespace-collapsed / lowercased input against
 * every entry in `answer.acceptedAnswers` — mirrors the semantics of the
 * old text_answer step type in phase-1 demo.
 *
 * Empty `acceptedAnswers` = ungradable block; the section stays open (no
 * submission accepted). That's a data bug on the block, not something this
 * component should paper over.
 */
export function ChatFreeResponseBubble({
  block,
  questionLabel,
  placeholder,
  sendLabel,
  disabled,
  onSubmit,
}: ChatFreeResponseBubbleProps) {
  const t = useTranslations('courses')
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptedAnswers = useMemo(() => block.answer.acceptedAnswers ?? [], [block.answer])
  const canSubmit = acceptedAnswers.length > 0

  const isDisabled = disabled || submitted || !canSubmit

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return
    setSubmitted(true)
    setComposerOpen(false)
    const isCorrect = matchesAny(trimmed, acceptedAnswers)
    onSubmit(block.id, trimmed, isCorrect)
  }

  const handleFormulaInsert = useCallback(
    (latex: string) => {
      const el = inputRef.current
      const start = el?.selectionStart ?? value.length
      const end = el?.selectionEnd ?? value.length
      const wrapped = `$${latex}$`
      setValue(value.substring(0, start) + wrapped + value.substring(end))
      setComposerOpen(false)
      requestAnimationFrame(() => {
        const caret = start + wrapped.length
        el?.focus()
        el?.setSelectionRange(caret, caret)
      })
    },
    [value],
  )

  return (
    <div className="flex flex-col gap-content-gap">
      {questionLabel && (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary font-extrabold text-body-sm self-start">
          {questionLabel}
        </span>
      )}

      <div className="text-body-md font-medium text-foreground leading-relaxed">
        <RichTextRenderer block={block.prompt} />
      </div>

      <div className="relative mt-2" data-math-controls>
        <form onSubmit={handleSubmit} className="flex items-center gap-content-gap-xs" dir="rtl">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={isDisabled}
            dir="rtl"
            className={cn(
              'flex-1 rounded-xl border border-input bg-background px-4 py-2.5',
              'text-body-md text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          />

          {!isDisabled && (
            <button
              type="button"
              onClick={() => setComposerOpen((v) => !v)}
              aria-label={t('insertFormula')}
              title={t('insertFormula')}
              className={cn(
                'w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all active:scale-95',
                'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
              )}
            >
              <FunctionSquare className="w-5 h-5" />
            </button>
          )}

          <button
            type="submit"
            disabled={isDisabled || !value.trim()}
            aria-label={sendLabel}
            className={cn(
              'px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold',
              'flex items-center gap-content-gap-xs hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{sendLabel}</span>
          </button>
        </form>

        <AnimatePresence>
          {composerOpen && !isDisabled && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full inset-x-0 mt-2 z-20"
            >
              <FormulaComposer
                onInsert={handleFormulaInsert}
                onClose={() => setComposerOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Per-block notebook — chat-native path bypasses QuestionCard so
          we mount here. Admin opt-in required (`block.showNotebook ===
          true`, from admin PR #409); `disabled` follows the input lock
          so scroll-back bubbles can't dispatch Check-solution against
          the walker's current step (which would cite the wrong section). */}
      {block.showNotebook === true && (
        <QuestionNotebook contextTitle={questionLabel ?? block.id} disabled={isDisabled} />
      )}
    </div>
  )
}

/** Whitespace-collapsed, lowercased equality against any accepted answer. */
function matchesAny(input: string, accepted: readonly string[]): boolean {
  const normalized = normalize(input)
  return accepted.some((candidate) => normalize(candidate) === normalized)
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, '').toLowerCase()
}
