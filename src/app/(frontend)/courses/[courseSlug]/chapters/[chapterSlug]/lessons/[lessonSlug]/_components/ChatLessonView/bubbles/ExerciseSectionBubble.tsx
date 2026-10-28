'use client'

import { useMediaQuery } from '@/client/hooks/useMediaQuery'
import type { AxisSpecV1 } from '@/infra/contracts/graphics/axis.v1'
import type { GeometrySpecV1 } from '@/infra/contracts/graphics/geometry.v1'
import type { Exercise, Media } from '@/infra/types/content'
import type {
  ExerciseBlockGroup,
  GraphLayout,
  InlineRichText,
  RichTextBlock,
} from '@/infra/types/exercise'
import type {
  QuestionFreeResponseBlock,
  QuestionSelectBlock,
  QuestionSelectMcqBlock,
  QuestionSelectTrueFalseBlock,
  SvgBlock,
} from '@/ui/web/exerciserenderer/types'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { AxisRenderer } from '@/ui/web/exerciserenderer/blocks/AxisRenderer'
import { GeometryRenderer } from '@/ui/web/exerciserenderer/blocks/GeometryRenderer'
import { GraphWithPrompt } from '@/ui/web/exerciserenderer/blocks/GraphWithPrompt'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { SvgRenderer } from '@/ui/web/exerciserenderer/blocks/SvgRenderer'
import { MediaMapProvider } from '@/ui/web/exerciserenderer/context/MediaMapContext'
import { SketchMaxHeightProvider } from '@/ui/web/exerciserenderer/context/SketchMaxHeightContext'
import { readExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { SectionOutcome } from '../types'
import { ChatFreeResponseBubble, type ValidationErrorMessages } from './ChatFreeResponseBubble'
import { ChatQuestionSelectBubble } from './ChatQuestionSelectBubble'
import { QuickActionChips, type QuickAction } from './QuickActionChips'

const EMPTY_MEDIA_MAP: Record<string, Media> = {}

// Tailwind `md` breakpoint — same mobile query SvgRenderer sizes against.
const MOBILE_QUERY = '(max-width: 767px)'
// Mobile cap on sketch height (svg / geometry / axis). Width follows the
// sketch's aspect ratio so the prompt, sketch and answer area fit together.
const MOBILE_SKETCH_MAX_HEIGHT_PX = 275

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
  /**
   * Per-chip disable from the runner's section-help bookkeeping. Flips to
   * true after the chip's AI follow-up has already fired for THIS section,
   * so a third tap can't keep spamming Gemini after both the authored
   * field reveal and the AI follow-up have been consumed.
   */
  hintDisabled?: boolean
  explainDisabled?: boolean
  /** i18n placeholders used by the chat-native free-response input. */
  freeResponsePlaceholder?: string
  freeResponseSendLabel?: string
  /** "Checking…" indicator shown while the server AI validates the answer. */
  freeResponsePendingLabel?: string
  /** Badge on the self-compare card when AI validation was skipped (quota out). */
  freeResponseNotCheckedLabel?: string
  /** Error-message bundle forwarded to validateFreeResponseOnServer. */
  freeResponseValidationErrors?: ValidationErrorMessages
  /** Task-7 quota flag — forwarded to the free-response bubble so it can skip
   *  the server AI and show self-compare instead of waiting on a doomed 429. */
  isQuotaExhausted?: boolean
  /**
   * Task-5 review-mode storage namespace. When set, every child bubble uses
   * this value as its `exerciseId` instead of the real `exercise.id`, so a
   * second attempt during focused review writes to a separate localStorage
   * key and doesn't overwrite the original pass's answers, retry state, or
   * submission history. Threaded here, not derived, so the walker owns the
   * naming convention (one place to change if we ever namespace differently).
   */
  storageIdOverride?: string
  /**
   * Task-3 retry hint. Fires when the student taps "תן לי רמז" after a first
   * wrong attempt on a 3+ option MCQ. The runner wires it to a
   * chat.requestCorrection with the hint-flavored prompt. Only forwarded for
   * ACTIVE bubbles — a scroll-back section shouldn't be able to post into
   * the current chat context.
   */
  onHintRequest?: (blockId: string, wrongChoiceText: string, correctChoiceText: string) => void
  /** Label for the retry hint CTA — provided by the runner from i18n. */
  retryHintLabel?: string
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
 * - CHAT-NATIVE: when every question in the section is a `question_select`
 *   (single- OR multi-select mcq, OR true/false) or `question_free_response`,
 *   optionally alongside a decorative sibling sketch (non-interactive svg,
 *   display-only geometry/axis) or a `rich_text` note. Renders the prompt as
 *   a chat message, options as chat buttons (auto-submit for single-select,
 *   toggle + check button for multi-select), and echoes each pick as a
 *   right-side student bubble in the stream via `onQuestionSubmit`.
 *
 * - FALLBACK: any other shape (table, matching, interactive-hotspot svg,
 *   multi-axis, html, latex, media) drops through to the shared
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
  hintDisabled,
  explainDisabled,
  freeResponsePlaceholder,
  freeResponseSendLabel,
  freeResponsePendingLabel,
  freeResponseNotCheckedLabel,
  freeResponseValidationErrors,
  isQuotaExhausted,
  storageIdOverride,
  onHintRequest,
  retryHintLabel,
  isActive = true,
  sectionKey,
}: ExerciseSectionBubbleProps) {
  const isChatNativePath = useMemo(() => isChatNativeSection(group), [group])
  // On mobile, question attachments stack prompt → sketch → answer area and
  // sketches are height-capped, so the student reads the question and sees
  // the drawing before reaching the options / input / table.
  const isMobile = useMediaQuery(MOBILE_QUERY)

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
    // Hydrate counters from the SAME storage namespace the child bubbles
    // write to — in review mode that's the override key, which starts empty
    // so the student answers afresh. Mirrors the exerciseId prop forwarded
    // below.
    const storageId = storageIdOverride ?? exercise.id
    const saved = storageId ? readExerciseState(storageId) : null
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
      // Mirror the chat-native "hide chips once the student engages" rule:
      // as soon as any question in the fallback section has been checked,
      // the quick-action chips are no longer a pre-answer discovery
      // affordance — they belong to the beginning of the attempt.
      if (results.checkedCount > 0) setHasAnyAnswer(true)
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

  // Label every section's first gradable question (even single-question
  // sections) so the student always sees which section they're on — matches
  // the scroll-view worksheet's per-section badge. `questionLabels` already
  // stamps only one entry per section (the first gradable question's id),
  // so subsequent questions in a multi-question section still render
  // unlabeled; only the leading one carries the section + exercise badges.
  const questionLabelById = useMemo(() => {
    if (!isChatNativePath) return null
    return questionLabels
  }, [questionLabels, isChatNativePath])

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
    <SketchMaxHeightProvider value={isMobile ? MOBILE_SKETCH_MAX_HEIGHT_PX : undefined}>
      <div className="flex flex-col gap-content-gap-lg">
        {isChatNativePath ? (
          // MediaMapProvider is required so RichTextRenderer's MediaAttachments
          // (used inside prompts, option labels, and inline rich_text) can look
          // up media by id. The standard ExerciseRenderer path installs this
          // provider itself; the chat-native path has to do it here.
          <MediaMapProvider value={mediaMap ?? EMPTY_MEDIA_MAP}>
            {group.blocks.map((block) => {
              // Section letter badges render only on the first gradable question
              // of each section (the only id in `questionLabelById`), so a multi-
              // question section's leading card is clearly labelled while
              // subsequent cards stay unlabelled. The exercise ordinal lives
              // separately on the exercise-intro's given-data card, not here —
              // repeating it on every section would just add noise.
              const sectionLabel = questionLabelById?.get(block.id)
              if (block.type === 'question_select') {
                return (
                  <ChatQuestionSelectBubble
                    key={block.id}
                    block={block as QuestionSelectBlock}
                    questionLabel={sectionLabel}
                    questionLabelActive={isActive}
                    // Freeze only while a chat request is in flight (otherwise
                    // the resulting requestCorrection would be silently
                    // dropped). Past-section bubbles stay answerable so a
                    // student can go back and finish anything they skipped.
                    disabled={quickActionsDisabled}
                    exerciseId={storageIdOverride ?? exercise.id}
                    lessonId={lessonId}
                    onSubmit={handleChatNativeSubmit}
                    onHintRequest={isActive ? onHintRequest : undefined}
                    retryHintLabel={retryHintLabel}
                    attachmentAfterPrompt={isMobile}
                  />
                )
              }
              if (block.type === 'question_free_response') {
                return (
                  <ChatFreeResponseBubble
                    key={block.id}
                    block={block as QuestionFreeResponseBlock}
                    questionLabel={sectionLabel}
                    questionLabelActive={isActive}
                    placeholder={freeResponsePlaceholder ?? ''}
                    sendLabel={freeResponseSendLabel ?? ''}
                    disabled={quickActionsDisabled}
                    exerciseId={storageIdOverride ?? exercise.id}
                    lessonId={lessonId}
                    onSubmit={handleChatNativeSubmit}
                    isQuotaExhausted={isQuotaExhausted}
                    pendingLabel={freeResponsePendingLabel}
                    notCheckedLabel={freeResponseNotCheckedLabel}
                    validationErrorMessages={freeResponseValidationErrors}
                    attachmentAfterPrompt={isMobile}
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
              // Decorative sibling sketches (non-interactive svg, display-only
              // geometry/axis). The allowlist in `isChatNativeSection` lets these
              // through so a section like `[question_geometry, question_select]`
              // keeps the chat-native treatment on the question instead of
              // dumping the whole group into the ExerciseRenderer fallback. Each
              // uses the same renderer the Interactive tab does so the sketch
              // looks identical across views.
              if (block.type === 'svg') {
                const svg = block as SvgBlock
                return <SvgRenderer key={svg.id} block={svg} displaySize={svg.displaySize} />
              }
              if (block.type === 'question_geometry') {
                const g = block as {
                  id: string
                  geometry: GeometrySpecV1
                  layout?: GraphLayout
                  prompt?: InlineRichText
                  displaySize?: 'small' | 'medium' | 'large' | 'full'
                }
                return (
                  <GraphWithPrompt
                    key={g.id}
                    blockId={g.id}
                    layout={g.layout ?? 'textRight'}
                    prompt={g.prompt}
                  >
                    <GeometryRenderer
                      blockId={g.id}
                      spec={g.geometry}
                      displaySize={g.displaySize}
                    />
                  </GraphWithPrompt>
                )
              }
              if (block.type === 'question_axis') {
                const a = block as {
                  id: string
                  axis: AxisSpecV1
                  layout?: GraphLayout
                  prompt?: InlineRichText
                  displaySize?: 'small' | 'medium' | 'large' | 'full'
                }
                return (
                  <GraphWithPrompt
                    key={a.id}
                    blockId={a.id}
                    layout={a.layout ?? 'textRight'}
                    prompt={a.prompt}
                  >
                    <AxisRenderer blockId={a.id} spec={a.axis} displaySize={a.displaySize} />
                  </GraphWithPrompt>
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
                  hintDisabled={hintDisabled}
                  explainDisabled={explainDisabled}
                  hintLabel={quickActionLabels.hint}
                  explainLabel={quickActionLabels.explain}
                  skipLabel={quickActionLabels.skip}
                  skipExerciseLabel={quickActionLabels.skipExercise}
                  onAction={handleChipAction}
                />
              )}
          </MediaMapProvider>
        ) : (
          <>
            <ExerciseRenderer
              groups={[group]}
              questionLabelsOverride={questionLabels}
              highlightQuestionLabels={isActive}
              mediaMap={mediaMap}
              exerciseNumber={ordinal}
              showExerciseNumber={false}
              lessonId={lessonId}
              exerciseId={storageIdOverride ?? exercise.id}
              hideLatexBlocks
              questionCardVariant="flat"
              // Only enable on the walker's current step — scroll-back
              // (historical) bubbles keep the notebook hidden so a stray
              // Check-solution click can't dispatch a drawing that
              // ChatLessonRunnerView would then attribute to whatever
              // section the walker is on RIGHT NOW.
              showNotebook={isActive}
              onResultsChange={questionCount > 0 ? handleAggregateResults : undefined}
              // Suppress the inline amber/purple HelpSystem — we render
              // QuickActionChips below instead so tables, matching, and the
              // other fallback block types share the chat view's button
              // styling (hint/explain in primary color plus skip + skip-
              // exercise) with the chat-native path above.
              hideHelpSystem
              attachmentAfterPrompt={isMobile}
            />
            {isActive &&
              !hasAnyAnswer &&
              onQuickAction &&
              quickActionLabels &&
              questionCount > 0 && (
                <QuickActionChips
                  disabled={quickActionsDisabled}
                  hintDisabled={hintDisabled}
                  explainDisabled={explainDisabled}
                  hintLabel={quickActionLabels.hint}
                  explainLabel={quickActionLabels.explain}
                  skipLabel={quickActionLabels.skip}
                  skipExerciseLabel={quickActionLabels.skipExercise}
                  onAction={handleChipAction}
                />
              )}
          </>
        )}
      </div>
    </SketchMaxHeightProvider>
  )
}

/**
 * Allowlist guard: a section is chat-native ONLY when every block is one of
 * — `question_select` (any variant), `question_free_response`, a `rich_text`
 * decoration, or a decorative sibling sketch (non-interactive svg, display-
 * only geometry/axis — see `isDecorativeSibling`). The chat-native render
 * loop below only knows how to render those; anything else (media, html,
 * latex, multi-axis, table/matching, interactive-hotspot svg) must fall back
 * to the shared ExerciseRenderer so nothing is silently dropped AND the
 * section outcome doesn't fire prematurely on a partial answer count.
 *
 * Questions carrying an `attachment` (sketch shown side-by-side with the
 * question) stay on the chat-native path — ChatQuestionSelectBubble and
 * ChatFreeResponseBubble render through ChatQuestionLayout, which honors the
 * authored `textLeft/textRight/textAbove/textBelow` layout on desktop and
 * stacks prompt → sketch → answer area on mobile.
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
      continue
    }
    if (block.type === 'question_free_response') {
      hasAnyQuestion = true
      continue
    }
    if (isDecorativeSibling(block)) continue
    // Any other block type → fallback path. ExerciseRenderer knows how to
    // render media/html/latex/etc. with all their affordances.
    return false
  }
  return hasAnyQuestion
}

/**
 * Non-gradable sketch siblings the chat-native loop renders inline next to a
 * question block. Mirrors `useExerciseWalker.isAnswerRequired`: svg is
 * decorative unless it carries interactive hotspots, and `question_axis` /
 * `question_geometry` are always treated as display in chat (their answer
 * flows aren't wired up here — if we need them, the whole group should drop
 * to the ExerciseRenderer fallback so the answer UI isn't silently lost).
 */
function isDecorativeSibling(block: { type: string; [key: string]: unknown }): boolean {
  if (block.type === 'question_axis' || block.type === 'question_geometry') return true
  if (block.type === 'svg') {
    const interactive = (block as { interactive?: boolean }).interactive === true
    const hotspots = (block as { hotspots?: unknown[] }).hotspots
    return !(interactive && Array.isArray(hotspots) && hotspots.length > 0)
  }
  return false
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
