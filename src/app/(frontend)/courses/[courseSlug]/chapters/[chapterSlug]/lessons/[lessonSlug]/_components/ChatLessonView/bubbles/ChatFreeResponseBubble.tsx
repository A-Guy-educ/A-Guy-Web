'use client'

import { cn } from '@/infra/utils/ui'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { QuestionNotebook } from '@/ui/web/exerciserenderer/components/QuestionNotebook'
import type { QuestionFreeResponseBlock } from '@/ui/web/exerciserenderer/types'
import { validateFreeResponseOnServer } from '@/ui/web/exerciserenderer/utils/answerChecking'
import {
  patchExerciseStateBlock,
  patchExerciseStateBlockMeta,
  readExerciseState,
} from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { MathPicker } from '@/ui/web/shared/MathInput/MathPicker'
import { MixedMathInput, type MixedMathInputRef } from '@/ui/web/shared/MathInput/MixedMathInput'
import { useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Sigma } from 'lucide-react'
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
  /**
   * Exercise id used to key the persisted answer bundle. When present, the
   * bubble hydrates its typed text + submitted/locked state from
   * localStorage on mount and writes back on submit. Shares the same key as
   * ExerciseRenderer so Reset wipes everything together. Falsy = no persist.
   */
  exerciseId?: string
  onSubmit: (blockId: string, text: string, isCorrect: boolean) => void
  /**
   * Task-7 quota flag. When true, local-miss paths skip the server AI check
   * (which would just 429) and fall back to Task-4's self-compare: the
   * block's solution is shown, the submission is recorded as `notChecked`,
   * and the student can continue the lesson.
   */
  isQuotaExhausted?: boolean
  /**
   * i18n labels for the Task-4 flow. Pulled from the runner so this component
   * stays locale-agnostic.
   *   - pendingLabel: shown while the server AI is running
   *   - notCheckedLabel: badge over the solution when AI validation was skipped
   *   - validationErrorMessages: forwarded to validateFreeResponseOnServer
   */
  pendingLabel?: string
  notCheckedLabel?: string
  validationErrorMessages?: ValidationErrorMessages
}

export interface ValidationErrorMessages {
  invalidAnswerType: string
  selectTrueFalse: string
  noCorrectAnswer: string
  selectAnAnswer: string
  enterAnAnswer: string
  unknownVariant: string
  validationFailed: string
  validationError: string
  connectionError: string
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
type SubmitStatus = 'idle' | 'pending' | 'submitted' | 'not_checked'

export function ChatFreeResponseBubble({
  block,
  questionLabel,
  placeholder,
  sendLabel,
  disabled,
  exerciseId,
  onSubmit,
  isQuotaExhausted,
  pendingLabel,
  notCheckedLabel,
  validationErrorMessages,
}: ChatFreeResponseBubbleProps) {
  const t = useTranslations('courses')
  // Hydrate typed text + locked state from the shared answer bundle on mount.
  // `submitted` means the pipeline (local match OR server AI OR not-checked
  // fallback) produced a terminal result; the input locks and the saved text
  // stays visible. patchExerciseStateBlock writes back on each step through
  // the pipeline (same key as ExerciseRenderer's bundle, so Reset wipes
  // everything together).
  const [{ initialValue, initialStatus }] = useState<{
    initialValue: string
    initialStatus: SubmitStatus
  }>(() => {
    if (!exerciseId) return { initialValue: '', initialStatus: 'idle' }
    const saved = readExerciseState(exerciseId)
    const answer = saved?.answers[block.id]
    const text = answer?.type === 'free_response' ? answer.value : ''
    const hasCheckResult = Boolean(saved?.checkResults[block.id])
    const wasNotChecked = saved?.blockMeta?.[block.id]?.notChecked === true
    return {
      initialValue: text,
      initialStatus: wasNotChecked ? 'not_checked' : hasCheckResult ? 'submitted' : 'idle',
    }
  })
  const [value, setValue] = useState(initialValue)
  const [status, setStatus] = useState<SubmitStatus>(initialStatus)
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const mathInputRef = useRef<MixedMathInputRef>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleInsertMath = useCallback((latex: string) => {
    mathInputRef.current?.insert(latex)
  }, [])

  const acceptedAnswers = useMemo(() => block.answer.acceptedAnswers ?? [], [block.answer])
  const canSubmit = acceptedAnswers.length > 0
  // Once the submit pipeline runs to completion (match OR server verdict OR
  // self-compare fallback) the input locks. Pending state also locks so the
  // student can't fire a second request on top of the in-flight one.
  const isLocked = status !== 'idle'
  const isDisabled = disabled || isLocked || !canSubmit

  const recordSubmission = useCallback(
    (text: string, isCorrect: boolean, notChecked: boolean) => {
      if (!exerciseId) return
      const saved = readExerciseState(exerciseId)
      const prior = saved?.blockMeta?.[block.id]?.submissions ?? []
      const next = [...prior, { text, isCorrect, at: Date.now(), notChecked }]
      patchExerciseStateBlockMeta(exerciseId, block.id, { submissions: next })
    },
    [exerciseId, block.id],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return
    setToolbarOpen(false)

    // Local match path — Task 4 says an approved answer passes instantly,
    // no AI, no quota cost. Mirrors the pre-Task-4 behavior for anything
    // in `acceptedAnswers` plus its normalized variants.
    if (matchesAny(trimmed, acceptedAnswers)) {
      setStatus('submitted')
      if (exerciseId) {
        patchExerciseStateBlock(exerciseId, block.id, {
          answer: { type: 'free_response', value: trimmed },
          checkResult: { isCorrect: true },
        })
      }
      recordSubmission(trimmed, true, false)
      onSubmit(block.id, trimmed, true)
      return
    }

    // Quota exhausted path — don't bother the server, fall back to self-
    // compare: the block's solution is rendered below the (locked) input so
    // the student can judge their own answer, and the submission is tagged
    // notChecked for later review.
    if (isQuotaExhausted) {
      setStatus('not_checked')
      if (exerciseId) {
        patchExerciseStateBlock(exerciseId, block.id, {
          answer: { type: 'free_response', value: trimmed },
          checkResult: { isCorrect: false },
        })
        patchExerciseStateBlockMeta(exerciseId, block.id, { notChecked: true })
      }
      recordSubmission(trimmed, false, true)
      // Report as `isCorrect: false` so the section outcome doesn't
      // mis-advance; the self-compare bubble lives inside this component
      // and the student taps the top-level Continue when they're ready.
      onSubmit(block.id, trimmed, false)
      return
    }

    // AI validation path — hit the shared server endpoint that first tries
    // DB normalization (exact, LaTeX, numeric ±0.0001) and only calls Gemini
    // if those miss. A 429 here is unlikely in practice (the Task-7 quota
    // flag catches it upstream) but if it slips through we treat it the
    // same as the no-quota branch: no verdict, self-compare mode.
    setStatus('pending')
    try {
      const result = validationErrorMessages
        ? await validateFreeResponseOnServer(block, trimmed, validationErrorMessages)
        : { isCorrect: false }
      setStatus('submitted')
      if (exerciseId) {
        patchExerciseStateBlock(exerciseId, block.id, {
          answer: { type: 'free_response', value: trimmed },
          checkResult: result,
        })
      }
      recordSubmission(trimmed, result.isCorrect, false)
      onSubmit(block.id, trimmed, result.isCorrect)
    } catch {
      setStatus('not_checked')
      if (exerciseId) {
        patchExerciseStateBlock(exerciseId, block.id, {
          answer: { type: 'free_response', value: trimmed },
          checkResult: { isCorrect: false },
        })
        patchExerciseStateBlockMeta(exerciseId, block.id, { notChecked: true })
      }
      recordSubmission(trimmed, false, true)
      onSubmit(block.id, trimmed, false)
    }
  }

  const triggerSubmit = useCallback(() => {
    formRef.current?.requestSubmit()
  }, [])

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
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex items-center gap-content-gap-xs"
          dir="rtl"
        >
          <div
            className={cn(
              'flex-1 rounded-xl border border-input bg-background px-4 py-2.5',
              'focus-within:border-primary transition-colors',
              isDisabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            <MixedMathInput
              ref={mathInputRef}
              value={value}
              onChange={setValue}
              onEnterKey={triggerSubmit}
              disabled={isDisabled}
              placeholder={placeholder}
            />
          </div>

          {!isDisabled && (
            <button
              type="button"
              onClick={() => setToolbarOpen((v) => !v)}
              aria-label={t('insertFormula')}
              title={t('insertFormula')}
              className={cn(
                'w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all active:scale-95',
                toolbarOpen
                  ? 'bg-primary text-primary-foreground border border-primary'
                  : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
              )}
            >
              <Sigma className="w-5 h-5" />
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
          {toolbarOpen && !isDisabled && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full inset-x-0 mt-2 z-20 rounded-lg border border-border bg-card shadow-card p-2"
            >
              <MathPicker onInsert={handleInsertMath} onClose={() => setToolbarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {status === 'pending' && pendingLabel && (
        <div
          className="self-start inline-flex items-center gap-1.5 text-caption text-muted-foreground mt-1"
          aria-live="polite"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
          <span>{pendingLabel}</span>
        </div>
      )}

      {status === 'not_checked' && (
        <div className="mt-2 rounded-xl border border-warning/40 bg-warning/5 p-card-padding-sm">
          {notCheckedLabel && (
            <p className="text-caption font-semibold text-warning uppercase tracking-wide mb-1.5">
              {notCheckedLabel}
            </p>
          )}
          {block.solution ? (
            <div className="text-body-sm text-foreground leading-relaxed">
              <RichTextRenderer block={block.solution} />
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">—</p>
          )}
        </div>
      )}

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

/**
 * Applied to both the student input and each acceptedAnswer before equality.
 * The `$…$` unwrap targets composer-produced LaTeX spans (`$x^2$` → `x^2`) so
 * they match plain accepted answers, but leaves lone `$` intact so a
 * currency-style acceptedAnswer like `$5` still needs an exact `$5`.
 */
function normalize(s: string): string {
  return s
    .trim()
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\s+/g, '')
    .toLowerCase()
}
