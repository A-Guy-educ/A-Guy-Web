'use client'

import { cn } from '@/infra/utils/ui'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { QuestionNotebook } from '@/ui/web/exerciserenderer/components/QuestionNotebook'
import type {
  InlineRichText,
  QuestionSelectBlock,
  QuestionSelectMcqBlock,
  QuestionSelectTrueFalseBlock,
} from '@/ui/web/exerciserenderer/types'
import {
  patchExerciseStateBlock,
  patchExerciseStateBlockMeta,
  readExerciseState,
} from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { ArrowLeft, Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Minimum option count for Task-3 retry mode. Spec is specifically about
 * three-option MCQs (ג); for a 2-option MCQ "retrying" would just pick the
 * one remaining option, which isn't a retry — just a reveal.
 */
const RETRY_MIN_OPTIONS = 3

interface ChatQuestionSelectBubbleProps {
  block: QuestionSelectBlock
  questionLabel?: string
  /**
   * When true, the option buttons are locked regardless of local pick state.
   * Used to freeze historical (scroll-back) bubbles + to prevent answering
   * while a hint/explain/auto-correction request is in flight (otherwise the
   * resulting requestCorrection would be silently dropped by
   * useChatChannel's `sendingRef` early-return).
   */
  disabled?: boolean
  /**
   * Exercise id used to key the persisted answer bundle. When present, the
   * bubble hydrates its pickedId from localStorage on mount and writes back
   * on each pick so single-select MCQ and true/false restore their locked +
   * green/red look on re-entry. Falsy = don't persist (unit tests, previews).
   */
  exerciseId?: string
  onSubmit: (blockId: string, optionText: string, isCorrect: boolean) => void
  /**
   * Task-3 retry hint CTA (3+ option MCQ only). Fires once per block when the
   * student taps "תן לי רמז" after a first wrong attempt. The runner wires it
   * to a chat.requestCorrection call with the hint-flavored prompt. Omit the
   * prop to disable the retry hint entirely (unit tests, previews). The
   * `wrongChoiceText` is the first wrong option label; `correctChoiceText`
   * is the correct option label — both go into the prompt template.
   */
  onHintRequest?: (blockId: string, wrongChoiceText: string, correctChoiceText: string) => void
  /** Label shown on the retry hint CTA. Provided by the parent from i18n. */
  retryHintLabel?: string
}

interface Choice {
  id: string
  /** Plain text form for echoing into the student bubble. */
  labelValue: string
  /** Rich-text form for on-screen rendering (supports mediaIds + SVG-aware imgs). */
  labelBlock: InlineRichText
}

/**
 * Chat-native renderer for `question_select` blocks (both MCQ single-select
 * and true/false). Auto-submits on click — no separate "Check" button, no
 * card chrome around the question. Correctness is computed locally against
 * the block's `correctOptionIds` / `correctOptionId` and reported to the
 * parent via `onSubmit(optionText, isCorrect)`.
 *
 * Multi-select MCQs are NOT handled here — the caller should route them to
 * the existing ExerciseRenderer (with `questionCardVariant='flat'`) since
 * multi-select needs a submit-after-selection flow this component skips.
 */
export function ChatQuestionSelectBubble({
  block,
  questionLabel,
  disabled,
  exerciseId,
  onSubmit,
  onHintRequest,
  retryHintLabel,
}: ChatQuestionSelectBubbleProps) {
  const choices = useMemo(() => getChoices(block), [block])
  const correctIds = useMemo(() => getCorrectIds(block), [block])

  // 3-option MCQ (ג) → Task 3 retry mode: first wrong pick is marked, locked,
  // and NOT reported as the section outcome — student picks again from the
  // remaining options. Second pick (correct or wrong) is the final answer.
  // 2-option true/false and 2-option MCQ keep the single-pick flow because
  // "retry" with one remaining option isn't a retry — it's a reveal.
  const isRetryEligible = block.variant === 'mcq' && choices.length >= RETRY_MIN_OPTIONS

  // Hydrate from the saved bundle so a return visit shows:
  //   - the FINAL pick with its green/red styling (pickedId)
  //   - any prior wrong attempts still locked + red (wrongOptionIds)
  //   - the hint-already-shown flag so a mid-attempt refresh can't re-fire it
  // Writes back on every state transition via patchExerciseState* helpers,
  // sharing the same `a-guy:exercise-state:v1:<exerciseId>` key the fallback
  // ExerciseRenderer path uses — Reset wipes both at once.
  const [pickedId, setPickedId] = useState<string | null>(() => {
    if (!exerciseId) return null
    const saved = readExerciseState(exerciseId)
    const answer = saved?.answers[block.id]
    if (!answer || answer.type !== 'mcq' || answer.selectedIds.length === 0) return null
    return answer.selectedIds[0]
  })
  const [wrongOptionIds, setWrongOptionIds] = useState<Set<string>>(() => {
    if (!exerciseId) return new Set()
    const saved = readExerciseState(exerciseId)
    const stored = saved?.blockMeta?.[block.id]?.wrongOptionIds
    return new Set(stored ?? [])
  })
  const [hintShown, setHintShown] = useState<boolean>(() => {
    if (!exerciseId) return false
    const saved = readExerciseState(exerciseId)
    return saved?.blockMeta?.[block.id]?.hintShown === true
  })

  const handlePick = (choice: Choice) => {
    if (pickedId || disabled || wrongOptionIds.has(choice.id)) return
    const isCorrect = correctIds.has(choice.id)

    // Task 3 first-miss branch: mark the wrong choice, keep the question open,
    // DON'T emit the section outcome yet. The remaining options stay clickable
    // and the hint CTA becomes available. Hint and retry are only offered on
    // the first miss — a second miss drops through to the normal onSubmit path
    // below so Task 2's teacher-AI correction fires.
    if (isRetryEligible && !isCorrect && wrongOptionIds.size === 0) {
      const nextWrong = new Set(wrongOptionIds)
      nextWrong.add(choice.id)
      setWrongOptionIds(nextWrong)
      if (exerciseId) {
        patchExerciseStateBlockMeta(exerciseId, block.id, {
          wrongOptionIds: Array.from(nextWrong),
        })
      }
      return
    }

    // Final pick — single-attempt blocks (true/false, 2-option mcq, retry-
    // ineligible), the first correct try, or the second attempt in retry mode.
    setPickedId(choice.id)
    if (exerciseId) {
      patchExerciseStateBlock(exerciseId, block.id, {
        answer: { type: 'mcq', selectedIds: [choice.id] },
        checkResult: { isCorrect },
      })
      // On a second-attempt miss, record it in wrongOptionIds too so the
      // persisted view matches what the student saw on screen (both wrong
      // picks painted red).
      if (!isCorrect && wrongOptionIds.size > 0) {
        const nextWrong = new Set(wrongOptionIds)
        nextWrong.add(choice.id)
        setWrongOptionIds(nextWrong)
        patchExerciseStateBlockMeta(exerciseId, block.id, {
          wrongOptionIds: Array.from(nextWrong),
        })
      }
    }
    onSubmit(block.id, choice.labelValue, isCorrect)
  }

  const handleHintRequest = () => {
    if (!onHintRequest || hintShown || disabled) return
    const firstWrongId = Array.from(wrongOptionIds)[0]
    const wrongChoice = choices.find((c) => c.id === firstWrongId)
    const correctId = Array.from(correctIds)[0]
    const correctChoice = choices.find((c) => c.id === correctId)
    if (!wrongChoice || !correctChoice) return
    setHintShown(true)
    if (exerciseId) {
      patchExerciseStateBlockMeta(exerciseId, block.id, { hintShown: true })
    }
    onHintRequest(block.id, wrongChoice.labelValue, correctChoice.labelValue)
  }

  // Retry hint CTA is visible only during the "post-first-miss, pre-second-
  // attempt" window: at least one wrong attempt recorded, no final pick yet,
  // hint hasn't fired yet, and the parent wired an onHintRequest + label.
  const showRetryHintCta =
    isRetryEligible &&
    pickedId === null &&
    wrongOptionIds.size > 0 &&
    !hintShown &&
    !disabled &&
    typeof onHintRequest === 'function' &&
    typeof retryHintLabel === 'string' &&
    retryHintLabel.length > 0

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

      <div className="grid grid-cols-1 gap-content-gap-xs mt-2">
        {choices.map((choice) => {
          const isPicked = pickedId === choice.id
          const isWronglyAttempted = wrongOptionIds.has(choice.id)
          // Disabled when: a final pick has been made, this option was
          // already tried wrong, OR the parent has frozen the bubble.
          const isDisabled = pickedId !== null || isWronglyAttempted || Boolean(disabled)
          const isThisCorrect = correctIds.has(choice.id)
          // Red styling covers both the final-pick-wrong case AND any locked
          // wrong attempts from Task 3 retry mode.
          const showAsWrong = (isPicked && !isThisCorrect) || isWronglyAttempted
          const showAsCorrect = isPicked && isThisCorrect
          return (
            <button
              key={choice.id}
              type="button"
              disabled={isDisabled}
              onClick={() => handlePick(choice)}
              className={cn(
                'w-full text-right p-3.5 rounded-xl border-2 flex items-center justify-between gap-3',
                'font-semibold text-body-md transition-colors',
                'disabled:cursor-not-allowed',
                !isDisabled &&
                  'border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 text-foreground',
                isDisabled &&
                  !showAsWrong &&
                  !showAsCorrect &&
                  'border-border/40 bg-muted/40 text-muted-foreground opacity-70',
                showAsCorrect && 'border-success/60 bg-success/10 text-foreground',
                showAsWrong && 'border-error/60 bg-error/10 text-foreground',
              )}
            >
              <span className="flex-1 text-right">
                <RichTextRenderer block={choice.labelBlock} />
              </span>
              <ArrowLeft
                className={cn(
                  'w-4 h-4 shrink-0',
                  showAsCorrect && 'text-success',
                  showAsWrong && 'text-error',
                  !showAsCorrect && !showAsWrong && 'text-primary',
                )}
              />
            </button>
          )
        })}
      </div>

      {showRetryHintCta && (
        <button
          type="button"
          onClick={handleHintRequest}
          className={cn(
            'self-start inline-flex items-center gap-1.5 rounded-full px-3 py-1',
            'text-body-xs font-semibold border mt-1 transition-colors',
            'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10 hover:border-warning/50',
          )}
        >
          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{retryHintLabel}</span>
        </button>
      )}

      {/* Per-block notebook — chat-native questions bypass QuestionCard,
          so we attach the toggle here directly. Same ask-action bridge
          as QuestionCard's version. Admin opt-in required
          (`block.showNotebook === true`, from admin PR #409); `disabled`
          mirrors the answer input's lock so scroll-back bubbles can't
          dispatch Check-solution against the walker's current step. */}
      {block.showNotebook === true && (
        <QuestionNotebook contextTitle={questionLabel ?? block.id} disabled={disabled} />
      )}
    </div>
  )
}

function getChoices(block: QuestionSelectBlock): Choice[] {
  if (block.variant === 'true_false') {
    // `options` is required per @/infra/types/exercise; the UI type marks it
    // optional so we still guard with `?? []` — a missing array means bad
    // data (renders no options; student sees a stuck section, which is
    // preferable to hardcoding locale-specific fallback labels here).
    const options = (block as QuestionSelectTrueFalseBlock).options ?? []
    return options.map((o) => ({
      id: o.id,
      labelValue: o.label.value,
      labelBlock: o.label,
    }))
  }
  const mcq = block as QuestionSelectMcqBlock
  return mcq.answer.options.map((o) => ({
    id: o.id,
    labelValue: o.content.value,
    labelBlock: o.content,
  }))
}

function getCorrectIds(block: QuestionSelectBlock): Set<string> {
  if (block.variant === 'true_false') {
    const id = (block as QuestionSelectTrueFalseBlock).answer.correctOptionId
    return new Set(id ? [id] : [])
  }
  return new Set((block as QuestionSelectMcqBlock).answer.correctOptionIds)
}
