'use client'

import type { Exercise, Media } from '@/infra/types/content'
import type { ExerciseBlockGroup, RichTextBlock } from '@/infra/types/exercise'
import type {
  QuestionFreeResponseBlock,
  QuestionSelectBlock,
  QuestionSelectMcqBlock,
  QuestionSelectTrueFalseBlock,
} from '@/ui/web/exerciserenderer/types'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { MediaMapProvider } from '@/ui/web/exerciserenderer/context/MediaMapContext'
import { readExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { SectionOutcome } from '../types'
import { ChatFreeResponseBubble } from './ChatFreeResponseBubble'
import { ChatQuestionSelectBubble } from './ChatQuestionSelectBubble'
import { QuickActionChips, type QuickAction } from './QuickActionChips'

const EMPTY_MEDIA_MAP: Record<string, Media> = {}

interface ExerciseSectionBubbleProps {
  exercise: Exercise
  ordinal: number
  group: ExerciseBlockGroup
  /**
   * Exercise-wide `block.id → label` map. Computed once by the walker
   * from ALL of the exercise's groups so labels don't restart at `א` per
   * bubble and untitled multi-question sections still show `א/ב/ג`
   * instead of collapsing to `א1/א2`. Missing entries fall back to
   * `String(idx + 1)` in the chat-native path.
   */
  questionLabels: Map<string, string>
  questionCount: number
  lessonId: string
  mediaMap?: Record<string, Media>
  /** Speak the section's teacher header line if the chrome renders one. */
  onSpeak?: () => void
  speaking?: boolean
  muted?: boolean
  ttsSupported?: boolean
  /**
   * Stream key of THIS section's entry (`sec-${exerciseId}-${groupIndex}`).
   * Echoed back on outcome / question submit so the runner can position the
   * feedback bubbles under THIS section instead of unconditionally appending
   * to the end of the stream — needed once past (scroll-back) sections are
   * answerable.
   */
  sectionKey: string
  /**
   * Fires when the student has finished the section — either all questions
   * checked correctly or at least one wrong. Fires once. Not called for
   * intro-only groups (questionCount === 0).
   */
  onOutcome?: (sectionKey: string, outcome: SectionOutcome) => void
  /**
   * Fires per-question when the student picks an answer in the chat-native
   * path. Used by the runner to emit right-aligned student bubbles into the
   * shared stream. Not called in the fallback (ExerciseRenderer) path — those
   * students see the check button + inline correct/wrong strip instead.
   */
  onQuestionSubmit?: (sectionKey: string, text: string, isCorrect: boolean) => void
  /**
   * Fires when the student taps a quick-action chip (hint / explain / skip)
   * on a chat-native section. Runner dispatches: hint/explain → invisible
   * chat request; skip → walker.advance. Chips auto-hide once any question
   * in the section has been answered.
   */
  onQuickAction?: (action: QuickAction) => void
  /** Labels for the chips. Provided by the runner from i18n. */
  quickActionLabels?: { hint: string; explain: string; skip: string; skipExercise: string }
  /** Disable chips while a chat request is already in flight. */
  quickActionsDisabled?: boolean
  /** i18n placeholders used by the chat-native free-response input. */
  freeResponsePlaceholder?: string
  freeResponseSendLabel?: string
  /**
   * True only for the walker's current step. Historical (scroll-back)
   * bubbles pass false — the student CAN still answer them (feedback is
   * routed to the right place via `sectionKey`), but quick-action chips
   * and the notebook stay gated to the active step because those dispatch
   * through runner callbacks that are inherently scoped to "current".
   */
  isActive?: boolean
}

/**
 * A section rendered as a chat bubble. Two rendering paths:
 *
 * - CHAT-NATIVE: when every question in the section is a single-select
 *   `question_select` (mcq single-select OR true/false). Renders the prompt
 *   as a chat message, options as chat buttons that auto-submit on click,
 *   and echoes each pick as a right-side student bubble in the stream via
 *   `onQuestionSubmit`. Non-question blocks (rich_text) render inline.
 *
 * - FALLBACK: any other shape (multi-select mcq, free-response, table,
 *   matching, geometry, axis, svg, etc.) drops through to the shared
 *   `ExerciseRenderer` with `questionCardVariant='flat'` so the internal
 *   card chrome is stripped to blend inside the bubble.
 *
 * Both paths report the section-level outcome via `onOutcome` exactly once.
 */
export function ExerciseSectionBubble({
  exercise,
  ordinal,
  group,
  questionLabels,
  questionCount,
  lessonId,
  mediaMap,
  onSpeak: _onSpeak,
  speaking: _speaking,
  muted: _muted,
  ttsSupported: _ttsSupported,
  onOutcome,
  onQuestionSubmit,
  onQuickAction,
  quickActionLabels,
  quickActionsDisabled,
  freeResponsePlaceholder,
  freeResponseSendLabel,
  isActive = true,
  sectionKey,
}: ExerciseSectionBubbleProps) {
  const isChatNativePath = useMemo(() => isChatNativeSection(group), [group])

  // Correct-answer text for the FALLBACK path (no per-question outcome
  // signal there — we can only echo the whole section's correct answers).
  const allCorrectAnswerText = useMemo(() => deriveCorrectAnswerText(group), [group])

  const chatNativeQuestionCount = useMemo(
    () => (isChatNativePath ? group.blocks.filter(isChatNativeQuestion).length : 0),
    [group.blocks, isChatNativePath],
  )

  // Hydrate chat-native outcome counters from the shared answer bundle so a
  // partially-answered section resumes with the right counts. Without this,
  // a student who answered 1 of 2 questions in the active section would be
  // stuck: the restored pickedId locks that first question (handlePick early-
  // returns), the counter stays at 0, and even after answering question 2 the
  // outcome check `submittedCount >= total` never trips.
  const seeded = useMemo(() => {
    if (!isChatNativePath) return { submitted: 0, correct: 0, wrongIds: [] as string[] }
    const saved = exercise.id ? readExerciseState(exercise.id) : null
    if (!saved) return { submitted: 0, correct: 0, wrongIds: [] as string[] }
    const chatQs = group.blocks.filter(isChatNativeQuestion)
    const wrongIds: string[] = []
    let submitted = 0
    let correct = 0
    for (const q of chatQs) {
      const answer = saved.answers[q.id]
      const result = saved.checkResults[q.id]
      if (!answer) continue
      submitted += 1
      if (result?.isCorrect) correct += 1
      else if (result && !result.isCorrect) wrongIds.push(q.id)
    }
    return { submitted, correct, wrongIds }
    // Lazy-only; later saves to the bundle shouldn't reset the running refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mark the outcome as already-reported when the saved state shows every
  // chat-native question was previously answered — prevents re-firing the
  // celebration / correction when the student re-visits a finished section.
  const outcomeReportedRef = useRef(
    chatNativeQuestionCount > 0 && seeded.submitted >= chatNativeQuestionCount,
  )
  // Chips hide the moment the student starts answering — they're a discovery
  // affordance for "what can I do before answering", not a mid-answer HUD.
  const [hasAnyAnswer, setHasAnyAnswer] = useState(seeded.submitted > 0)
  // Block IDs the student answered incorrectly. Used to scope the "correct
  // answer" bubble to ONLY the questions they missed, so a multi-question
  // section doesn't leak answers to questions they got right.
  const wrongBlockIdsRef = useRef<Set<string>>(new Set(seeded.wrongIds))
  // Human-readable text of the specific wrong choices the student picked —
  // forwarded on the wrong outcome so the teacher-AI correction prompt can
  // reference *why that choice* is wrong rather than lecturing in the
  // abstract. Only populated by the chat-native path (handleChatNativeSubmit
  // sees the answer text); the aggregate path leaves it unset.
  const wrongAnswerTextsRef = useRef<string[]>([])

  // ── FALLBACK path ────────────────────────────────────────────────────────
  // Existing aggregate onResultsChange from ExerciseRenderer; fires onOutcome
  // once the section has been fully checked via the Check button flow.
  const handleAggregateResults = useCallback(
    (results: { totalQuestions: number; checkedCount: number; correctCount: number }) => {
      if (outcomeReportedRef.current) return
      if (results.totalQuestions === 0) return
      if (results.checkedCount < results.totalQuestions) return
      outcomeReportedRef.current = true
      if (results.correctCount === results.totalQuestions) {
        onOutcome?.(sectionKey, { kind: 'correct' })
      } else {
        onOutcome?.(sectionKey, { kind: 'wrong', correctAnswerText: allCorrectAnswerText })
      }
    },
    [allCorrectAnswerText, onOutcome, sectionKey],
  )

  // ── CHAT-NATIVE path ─────────────────────────────────────────────────────
  // Per-question submits accumulate here; when every question in the section
  // has been picked we emit the section outcome exactly once.
  const submittedCountRef = useRef(seeded.submitted)
  const correctCountRef = useRef(seeded.correct)

  // Only label individual questions when the section has more than one — a
  // solo question doesn't need a leading badge. We look each block up in
  // the exercise-wide `questionLabels` map so both schemes (titled `X1/X2`
  // and untitled per-question `א/ב/ג` running counter) surface correctly.
  const questionLabelById = useMemo(() => {
    if (!isChatNativePath || chatNativeQuestionCount < 2) return null
    return questionLabels
  }, [chatNativeQuestionCount, questionLabels, isChatNativePath])

  const handleChatNativeSubmit = useCallback(
    (blockId: string, text: string, isCorrect: boolean) => {
      submittedCountRef.current += 1
      if (isCorrect) {
        correctCountRef.current += 1
      } else {
        wrongBlockIdsRef.current.add(blockId)
        const trimmed = text.trim()
        if (trimmed) wrongAnswerTextsRef.current.push(trimmed)
      }
      setHasAnyAnswer(true)
      onQuestionSubmit?.(sectionKey, text, isCorrect)

      if (
        !outcomeReportedRef.current &&
        submittedCountRef.current >= chatNativeQuestionCount &&
        chatNativeQuestionCount > 0
      ) {
        outcomeReportedRef.current = true
        if (correctCountRef.current === chatNativeQuestionCount) {
          onOutcome?.(sectionKey, { kind: 'correct' })
        } else {
          onOutcome?.(sectionKey, {
            kind: 'wrong',
            // Scope the echoed "correct answer" to only the questions the
            // student got wrong — don't leak answers to ones they nailed.
            correctAnswerText: deriveCorrectAnswerText(group, wrongBlockIdsRef.current),
            // Comma-join the specific wrong choices so a 2-question section
            // where both were missed still gives the teacher-AI the choices.
            studentAnswerText:
              wrongAnswerTextsRef.current.length > 0
                ? wrongAnswerTextsRef.current.join(', ')
                : undefined,
          })
        }
      }
    },
    [chatNativeQuestionCount, group, onOutcome, onQuestionSubmit, sectionKey],
  )

  // Wrap chip clicks so a scroll-back click can't dispatch through the runner
  // — and both skip chips count as "engaged with this section" so they hide
  // the chips on the departing bubble (otherwise they'd linger after skip
  // since no answer was submitted).
  const handleChipAction = useCallback(
    (action: QuickAction) => {
      if (!isActive) return
      if (action === 'skip' || action === 'skipExercise') setHasAnyAnswer(true)
      onQuickAction?.(action)
    },
    [isActive, onQuickAction],
  )

  // Frameless layout — exercise content flows directly on the background
  // to match the chat-view mockup. Past (scroll-back) sections render at
  // full opacity and remain answerable: the runner routes their feedback
  // under the correct section via `sectionKey`.
  return (
    <div className="flex flex-col gap-content-gap">
      {isChatNativePath ? (
        // MediaMapProvider is required so RichTextRenderer's MediaAttachments
        // (used inside prompts, option labels, and inline rich_text) can look
        // up media by id. The standard ExerciseRenderer path installs this
        // provider itself; the chat-native path has to do it here.
        <MediaMapProvider value={mediaMap ?? EMPTY_MEDIA_MAP}>
          {group.blocks.map((block) => {
            if (block.type === 'question_select') {
              return (
                <ChatQuestionSelectBubble
                  key={block.id}
                  block={block as QuestionSelectBlock}
                  questionLabel={questionLabelById?.get(block.id)}
                  // Freeze only while a chat request is in flight (otherwise
                  // the resulting requestCorrection would be silently
                  // dropped). Past-section bubbles stay answerable so a
                  // student can go back and finish anything they skipped.
                  disabled={quickActionsDisabled}
                  exerciseId={exercise.id}
                  onSubmit={handleChatNativeSubmit}
                />
              )
            }
            if (block.type === 'question_free_response') {
              return (
                <ChatFreeResponseBubble
                  key={block.id}
                  block={block as QuestionFreeResponseBlock}
                  questionLabel={questionLabelById?.get(block.id)}
                  placeholder={freeResponsePlaceholder ?? ''}
                  sendLabel={freeResponseSendLabel ?? ''}
                  disabled={quickActionsDisabled}
                  exerciseId={exercise.id}
                  onSubmit={handleChatNativeSubmit}
                />
              )
            }
            if (block.type === 'rich_text') {
              const rt = block as RichTextBlock
              // Rich text at the top of a section is typically the exercise's
              // "given data" — statement + figures. Amber-tint it so the
              // student can visually distinguish problem context from
              // question prompts. Matches the mockup's amber given-data card.
              return (
                <div
                  key={block.id}
                  className="rounded-2xl border border-warning/30 bg-warning/8 p-card-padding-sm text-body-md font-medium text-foreground leading-relaxed"
                >
                  <RichTextRenderer block={rt} />
                </div>
              )
            }
            return null
          })}

          {isActive &&
            !hasAnyAnswer &&
            onQuickAction &&
            quickActionLabels &&
            chatNativeQuestionCount > 0 && (
              <QuickActionChips
                disabled={quickActionsDisabled}
                hintLabel={quickActionLabels.hint}
                explainLabel={quickActionLabels.explain}
                skipLabel={quickActionLabels.skip}
                skipExerciseLabel={quickActionLabels.skipExercise}
                onAction={handleChipAction}
              />
            )}
        </MediaMapProvider>
      ) : (
        <ExerciseRenderer
          groups={[group]}
          questionLabelsOverride={questionLabels}
          mediaMap={mediaMap}
          exerciseNumber={ordinal}
          showExerciseNumber={false}
          lessonId={lessonId}
          exerciseId={exercise.id}
          hideLatexBlocks
          questionCardVariant="flat"
          // Only enable on the walker's current step — scroll-back
          // (historical) bubbles keep the notebook hidden so a stray
          // Check-solution click can't dispatch a drawing that
          // ChatLessonRunnerView would then attribute to whatever
          // section the walker is on RIGHT NOW.
          showNotebook={isActive}
          onResultsChange={questionCount > 0 ? handleAggregateResults : undefined}
        />
      )}
    </div>
  )
}

/**
 * Allowlist guard: a section is chat-native ONLY when every block is one of
 * — single-select `question_select`, `question_free_response`, or a
 * `rich_text` decoration. The chat-native render loop below only knows how
 * to render those three; anything else (media, svg, html, latex, multi-
 * axis, table/matching/geometry/axis, multi-select mcq) must fall back to
 * the shared ExerciseRenderer so nothing is silently dropped AND the
 * section outcome doesn't fire prematurely on a partial answer count.
 *
 * A question carrying an `attachment` (sketch shown side-by-side with the
 * question) also forces the fallback path: ChatQuestionSelectBubble /
 * ChatFreeResponseBubble don't render attachments, so a chat-native section
 * with an attached sketch would silently drop the visual.
 *
 * Kept as an explicit allowlist (rather than a growing rejectlist) so
 * adding new block types can't accidentally slip through.
 */
function isChatNativeSection(group: ExerciseBlockGroup): boolean {
  let hasAnyQuestion = false
  for (const block of group.blocks) {
    if (block.type === 'rich_text') continue
    if (block.type === 'question_select') {
      hasAnyQuestion = true
      const b = block as unknown as QuestionSelectBlock
      if (b.variant === 'mcq' && b.answer.multiSelect) return false
      if (hasAttachment(block)) return false
      continue
    }
    if (block.type === 'question_free_response') {
      hasAnyQuestion = true
      if (hasAttachment(block)) return false
      continue
    }
    // Any other block type → fallback path. ExerciseRenderer knows how to
    // render media/svg/html/latex/etc. with all their affordances.
    return false
  }
  return hasAnyQuestion
}

/** True when a question block carries a sketch attachment (svg / geometry / axis). */
function hasAttachment(block: unknown): boolean {
  return (
    typeof block === 'object' &&
    block !== null &&
    'attachment' in block &&
    Boolean((block as { attachment?: unknown }).attachment)
  )
}

/** Blocks the chat-native path treats as "gradable questions". */
function isChatNativeQuestion(block: { type: string }): boolean {
  return block.type === 'question_select' || block.type === 'question_free_response'
}

/**
 * Extract a joined "correct answer" string from gradable blocks in the
 * group. When `onlyBlockIds` is provided, restricts to those block IDs —
 * used by the chat-native path to echo answers ONLY for questions the
 * student got wrong (so a multi-question section doesn't leak answers to
 * ones they got right). Without the filter, echoes every question's answer
 * (used by the fallback path where per-question outcomes aren't available).
 *
 * question_select: joins `correctOptionIds` labels. question_free_response:
 * uses `acceptedAnswers[0]` as the canonical display form (the other
 * accepted variants are alternative phrasings, not the "right answer").
 */
function deriveCorrectAnswerText(
  group: ExerciseBlockGroup,
  onlyBlockIds?: Set<string>,
): string | undefined {
  const parts: string[] = []
  for (const block of group.blocks) {
    if (onlyBlockIds && !onlyBlockIds.has(block.id)) continue

    if (block.type === 'question_select') {
      const q = block as unknown as QuestionSelectBlock
      if (q.variant === 'true_false') {
        const tf = q as QuestionSelectTrueFalseBlock
        const correctId = tf.answer.correctOptionId
        const opt = tf.options?.find((o) => o.id === correctId)
        if (opt) parts.push(opt.label.value)
        continue
      }
      const mcq = q as QuestionSelectMcqBlock
      const correctIds = new Set(mcq.answer.correctOptionIds)
      const correctOpts = mcq.answer.options.filter((o) => correctIds.has(o.id))
      if (correctOpts.length > 0) {
        parts.push(correctOpts.map((o) => o.content.value).join(', '))
      }
      continue
    }

    if (block.type === 'question_free_response') {
      const fr = block as unknown as QuestionFreeResponseBlock
      const answer = fr.answer.acceptedAnswers?.[0]
      if (answer) parts.push(answer)
      continue
    }
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}
