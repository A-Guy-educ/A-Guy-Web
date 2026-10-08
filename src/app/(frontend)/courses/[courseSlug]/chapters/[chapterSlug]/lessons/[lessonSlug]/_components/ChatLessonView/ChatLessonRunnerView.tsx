'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { canAccessLearningExercise, getUserTierSlug } from '@/lib/tiers'
import type { Exercise, Media } from '@/infra/types/content'
import type { ContentBlock } from '@/infra/types/exercise'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'
import { formatExerciseContextMessage } from '@/infra/llm/exercise-context'
import { uploadDataUrlAsMedia } from '@/infra/media/uploadDataUrl'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { clearExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { logger } from '@/infra/utils/logger'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatInputPanel } from './ChatInputPanel'
import { ChatLessonProgress } from './ChatLessonProgress'
import { GivenDataFloating } from './GivenDataFloating'
import { ContinueButton } from './bubbles/ContinueButton'
import { ExerciseSectionBubble } from './bubbles/ExerciseSectionBubble'
import { PendingBubble } from './bubbles/PendingBubble'
import { StudentBubble } from './bubbles/StudentBubble'
import { TeacherBubble } from './bubbles/TeacherBubble'
import { TierLockBubble } from './bubbles/TierLockBubble'
import { SkippedMarker } from './bubbles/SkippedMarker'
import { QuotaExhaustedCard } from './bubbles/QuotaExhaustedCard'
import type { SectionOutcome, StreamEntry } from './types'
import { useBrowserTTS } from './useBrowserTTS'
import { useChatChannel } from './useChatChannel'
import { isAnswerRequired, useExerciseWalker } from './useExerciseWalker'
import { useLessonChatProgress } from './useLessonChatProgress'
import { pickCorrectReaction } from './correctResponses'

const CELEBRATION_ADVANCE_MS = 1500

/**
 * Window event name used by ChatLessonView's menu-dropdown "restart"
 * action to trigger ActiveChat's reset handler. The reset logic has to
 * stay inside ActiveChat (where `clearProgress`, walker state, and the
 * remount key all live), so the menu-side publisher just fires this
 * event instead of threading a callback through multiple layers.
 */
export const CHAT_LESSON_RESET_EVENT = 'chat-lesson-reset' as const

/** Stable empty map — avoids feeding a fresh `{}` into MediaMapProvider on
 *  every render, which would re-fire every `useMediaMap` descendant. */
const EMPTY_MEDIA_MAP: Record<string, Media> = {}

/**
 * Section stream keys are built as `sec-${exercise.id}-${groupIndex}`.
 * Split on the LAST dash so an id that ever acquires dashes still parses
 * cleanly; today Mongo ObjectIds are pure hex, but the walker key format
 * is the public contract between the walker + the outcome handler.
 */
function parseSectionKey(key: string): { exerciseId: string; groupIndex: number } | null {
  if (!key.startsWith('sec-')) return null
  const rest = key.slice(4)
  const lastDash = rest.lastIndexOf('-')
  if (lastDash === -1) return null
  const exerciseId = rest.slice(0, lastDash)
  const groupIndex = Number(rest.slice(lastDash + 1))
  if (!Number.isFinite(groupIndex)) return null
  return { exerciseId, groupIndex }
}

interface ChatLessonRunnerViewProps {
  lessonId: string
  lessonTitle: string
  exercises: Exercise[]
  mediaMap?: Record<string, Media>
  /** TTS instance hoisted from the parent (ChatLessonView) so its mute
   *  state can also drive the LessonMenu's mute item. */
  tts: ReturnType<typeof useBrowserTTS>
  /**
   * 1-based learning-lesson index within the course. Drives the free-tier
   * exercise clamp — `canAccessLearningExercise` unlocks the first 3
   * exercises in lessons past #3, and the walker emits a `tier-lock`
   * terminator at that cutoff. `null` disables the cap.
   */
  lessonLearningIndex?: number | null
}

export function ChatLessonRunnerView(props: ChatLessonRunnerViewProps) {
  // Reset action (now in the LessonMenu dropdown) remounts ActiveChat so
  // all internal state (entries, walker, chat channel) starts fresh —
  // the same guarantee the previous hasStarted-toggling flow gave us,
  // minus the extra start card.
  const [resetKey, setResetKey] = useState(0)
  return <ActiveChat key={resetKey} {...props} onExit={() => setResetKey((k) => k + 1)} />
}

interface ActiveChatProps extends ChatLessonRunnerViewProps {
  onExit: () => void
}

function ActiveChat({
  lessonId,
  lessonTitle,
  exercises,
  mediaMap,
  tts,
  onExit,
  lessonLearningIndex = null,
}: ActiveChatProps) {
  const t = useTranslations('courses')
  const locale = useLocale()
  const isHebrew = locale?.toLowerCase().startsWith('he') ?? false
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Clamp the walker's exercise list to the student's tier gate. The gate is
  // `canAccessLearningExercise(user, lessonLearningIndex, exerciseOrdinal)`;
  // we take the longest prefix that passes. When the clamp cuts something off
  // the walker's terminator becomes a `tier-lock` entry (see useExerciseWalker).
  const { user } = useCurrentUser()
  const tierUser = useMemo(
    () => ({ currentTier: getUserTierSlug(user as { currentTier?: string | null } | null) }),
    [user],
  )
  const cappedExercises = useMemo(() => {
    if (lessonLearningIndex === null) return exercises
    const out: Exercise[] = []
    for (let i = 0; i < exercises.length; i++) {
      if (!canAccessLearningExercise(tierUser, lessonLearningIndex, i + 1)) break
      out.push(exercises[i])
    }
    return out
  }, [exercises, lessonLearningIndex, tierUser])

  const [entries, setEntries] = useState<StreamEntry[]>([])
  // Separate tick for "stream grew at the end" — the scroll-to-bottom effect
  // keys on this instead of entries.length so that answering a past section
  // (which inserts feedback mid-stream) doesn't yank the viewport away from
  // where the student is reading.
  const [appendTick, setAppendTick] = useState(0)
  const append = useCallback((entry: StreamEntry) => {
    setEntries((prev) => [...prev, entry])
    setAppendTick((t) => t + 1)
  }, [])
  const insertAfter = useCallback((targetKey: string, entry: StreamEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.key === targetKey)
      if (idx === -1) return [...prev, entry]
      return [...prev.slice(0, idx + 1), entry, ...prev.slice(idx + 1)]
    })
  }, [])
  const replace = useCallback((key: string, entry: StreamEntry) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? entry : e)))
  }, [])

  // Persist walker position across visits so re-entering the lesson resumes
  // on the student's current section instead of restarting from exercise 1.
  // Chat Q&A is NOT restored here — only walker progress — see
  // useLessonChatProgress for the rationale. The same hook also tracks the
  // canned-reaction state (per-exercise "long shown" + lesson-wide last pair)
  // so refreshing mid-lesson doesn't reset the long/short selection rules.
  const {
    initialStepCursor,
    saveStepCursor,
    getCorrectResponseState,
    recordCorrectReaction,
    clearProgress,
  } = useLessonChatProgress(lessonId)

  const walker = useExerciseWalker({
    exercises: cappedExercises,
    append,
    isHebrew,
    initialStepCursor,
    totalExercisesBeforeTierCap: exercises.length,
  })
  const currentStep = walker.currentStep
  const currentExercise = currentStep?.exercise ?? null

  // Mirror every walker advance into storage. Fires on seed too (cursor is
  // whatever we resumed to), which is harmless — same value in, same value out.
  useEffect(() => {
    saveStepCursor(walker.stepCursor)
  }, [walker.stepCursor, saveStepCursor])

  // Scope the AI's attention to the current section (not the whole exercise
  // or, worse, whatever exercise the shared lesson-conversation was last
  // talking about). Passing just the current group's blocks + a section-
  // annotated title keeps every chat request grounded in the section the
  // student is actually on.
  const currentExerciseContext = useMemo(() => {
    if (!currentStep) return null
    const { exercise, group, sectionLabel } = currentStep
    const baseTitle = exercise.title?.trim() ?? ''
    const title = sectionLabel ? `${baseTitle} — סעיף ${sectionLabel}`.trim() : baseTitle
    // Cast: our lesson-fetched Media has `filename: string | null | undefined`
    // where the formatter's MediaItem expects `string | undefined`. The
    // formatter only ever falsy-checks filename, so a runtime null is fine.
    return formatExerciseContextMessage(
      title,
      group.blocks as Array<{ id: string; type: string; [key: string]: unknown }>,
      mediaMap as unknown as Parameters<typeof formatExerciseContextMessage>[2],
    )
  }, [currentStep, mediaMap])

  const chat = useChatChannel({
    lessonId,
    currentExerciseId: currentExercise?.id ?? null,
    currentExerciseContext,
    append,
    replace,
    acknowledgment: t('chatViewAcknowledgment'),
    errorMessage: t('chatViewChatError'),
    authRequiredMessage: t('chatViewAuthRequired'),
    quotaExceededMessage: t('chatViewQuotaExceeded'),
  })

  // Cancel any pending auto-advance timer whenever the student navigates or
  // resets — otherwise a leftover timer would fire after unmount.
  const pendingAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelPendingAdvance = useCallback(() => {
    if (pendingAdvanceRef.current !== null) {
      clearTimeout(pendingAdvanceRef.current)
      pendingAdvanceRef.current = null
    }
  }, [])
  useEffect(() => () => cancelPendingAdvance(), [cancelPendingAdvance])

  const advanceNow = useCallback(() => {
    cancelPendingAdvance()
    walker.advance()
  }, [cancelPendingAdvance, walker])

  // Key of the current walker step. Declared here (above the outcome +
  // submit handlers) so those callbacks can tell whether a reported event
  // came from the ACTIVE section (append feedback at the end + advance the
  // walker) or a PAST one (insert feedback right under that section's
  // bubble, leave the walker where it is).
  const activeStepKey = walker.currentStep
    ? `sec-${walker.currentStep.exercise.id}-${walker.currentStep.groupIndex}`
    : null

  const correctionPrompt = t('chatViewCorrectionPrompt')
  const totalCappedExercises = cappedExercises.length
  const handleOutcome = useCallback(
    (sectionKey: string, outcome: SectionOutcome) => {
      const isCurrent = sectionKey === activeStepKey
      if (outcome.kind === 'correct') {
        // The section key is `sec-${exercise.id}-${groupIndex}`. Exercise IDs
        // are Mongo ObjectIds (hex, no dashes); the last `-` splits the group
        // index safely regardless of future id format changes.
        const parsed = parseSectionKey(sectionKey)
        const state = getCorrectResponseState()
        // First correct section WITHIN THIS EXERCISE → long variant.
        // Subsequent correct sections in the same exercise → short.
        const wantLong = parsed ? !state.longShownByExerciseId[parsed.exerciseId] : true
        const { text: baseText, pairKey } = pickCorrectReaction({
          wantLong,
          lastPairKey: state.lastPairKey,
        })

        // Transition suffix only fires for the ACTIVE step on the last section
        // of its exercise — a past-section correction shouldn't claim we're
        // moving forward when the walker is already on a later step.
        let text = baseText
        if (isCurrent && walker.currentStep) {
          const step = walker.currentStep
          const isLastSection = step.groupIndex === step.groupsInExercise - 1
          if (isLastSection) {
            const isLastExercise = step.exerciseIndex === totalCappedExercises - 1
            text = isLastExercise
              ? `${baseText} סיימנו את השיעור.`
              : `${baseText} נעבור לתרגיל ${step.ordinal + 1}.`
          }
        }

        if (parsed) recordCorrectReaction(parsed.exerciseId, pairKey)

        const celebrateEntry: StreamEntry = {
          key: `celebrate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind: 'chat-assistant',
          text,
        }
        if (isCurrent) {
          append(celebrateEntry)
          cancelPendingAdvance()
          pendingAdvanceRef.current = setTimeout(() => {
            pendingAdvanceRef.current = null
            walker.advance()
          }, CELEBRATION_ADVANCE_MS)
        } else {
          // Past section finished correctly on scroll-back — route the
          // reaction under THAT section and leave the walker on
          // the current step.
          insertAfter(sectionKey, celebrateEntry)
        }
      } else {
        // Task 2: no inline "correct answer: X" reveal bubble. The question
        // card already marks the chosen option as wrong, and leaving the
        // correct answer unspoken keeps Task 3's 3-option retry flow viable
        // on the same pipeline (revealing it before a retry would spoil the
        // second attempt). The AI correction below still carries both texts
        // so the teacher can reference them.
        //
        // The AI correction request pulls context from the walker's CURRENT
        // step; firing it for a past section would mis-attribute the
        // explanation. Only kick off the AI explain pass for the active
        // section.
        if (isCurrent) {
          // The i18n provider does literal key lookup only — placeholder
          // substitution is done at the call site with `.replace()`, same
          // pattern as `couponApplied` elsewhere in the app. Fall back to
          // the generic correction prompt when either text is missing
          // (aggregate path, matching questions, etc.).
          const prompt =
            outcome.studentAnswerText && outcome.correctAnswerText
              ? t('chatViewCorrectionPromptWithChoice')
                  .replace('{choice}', outcome.studentAnswerText)
                  .replace('{correct}', outcome.correctAnswerText)
              : correctionPrompt
          chat.requestCorrection(prompt)
        }
      }
    },
    [
      activeStepKey,
      append,
      cancelPendingAdvance,
      chat,
      correctionPrompt,
      getCorrectResponseState,
      insertAfter,
      recordCorrectReaction,
      t,
      totalCappedExercises,
      walker,
    ],
  )

  // Right-side student bubbles are suppressed entirely for chat-native
  // question picks — the question card already marks the chosen option as
  // correct (green ✓) or wrong, so an echo bubble is pure duplication. The
  // spec is explicit on both sides:
  //   Task 1 — "no student bubble that duplicates the answer" (correct)
  //   Task 2 — "mark the wrong choice, without a bubble duplicating it"
  // The answer, result, and prior assistance are still saved — the
  // ExerciseRenderer writes them into the shared answer bundle, and the
  // outcome callback carries whatever the AI correction prompt needs.
  // The `onQuestionSubmit` plumbing on ExerciseSectionBubble stays optional
  // so a future task can re-attach a per-question hook without rewiring
  // every call site.

  // Quick-action chip dispatcher. Hint + explain go through the invisible
  // requestCorrection channel so only the AI reply lands in the stream
  // (no fake user bubble echoing our canned prompt). Skip just advances
  // the walker without any chat roundtrip; skipExercise jumps the walker
  // past every remaining section of the current exercise.
  const hintPrompt = t('chatViewChipHintPrompt')
  const explainPrompt = t('chatViewChipExplainPrompt')
  const handleQuickAction = useCallback(
    (action: 'hint' | 'explain' | 'skip' | 'skipExercise') => {
      if (action === 'skip') {
        advanceNow()
        return
      }
      if (action === 'skipExercise') {
        cancelPendingAdvance()
        walker.advanceToNextExercise()
        return
      }
      chat.requestCorrection(action === 'hint' ? hintPrompt : explainPrompt)
    },
    [advanceNow, cancelPendingAdvance, chat, explainPrompt, hintPrompt, walker],
  )

  const quickActionLabels = useMemo(
    () => ({
      hint: t('chatViewChipHint'),
      explain: t('chatViewChipExplain'),
      skip: t('chatViewChipSkip'),
      skipExercise: t('chatViewChipSkipExercise'),
    }),
    [t],
  )

  // Task-3 retry hint. The CTA lives inside ChatQuestionSelectBubble (shown
  // only after the first wrong attempt on a 3+ option MCQ); when the student
  // taps it, this handler composes a hint-flavored prompt that references the
  // specific wrong choice + correct answer and fires an invisible-user chat
  // request. The teacher-AI reply lands as the next assistant bubble. The CTA
  // auto-hides after one tap — see hintShown persistence in the bubble.
  const retryHintLabel = t('chatViewRetryHintCta')
  const handleHintRequest = useCallback(
    (_blockId: string, wrongChoiceText: string, correctChoiceText: string) => {
      const prompt = t('chatViewHintPromptWithChoice')
        .replace('{choice}', wrongChoiceText)
        .replace('{correct}', correctChoiceText)
      chat.requestCorrection(prompt)
    },
    [chat, t],
  )

  // Narration is click-only. Each TeacherBubble exposes an `onSpeak` button
  // (wired below to `tts.speak(...)`) so the student decides when to hear a
  // line. Auto-playing on entry arrival was removed per product request —
  // recordings stay available on demand.

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [appendTick])

  // Bridge for the notebook's "Check solution" button. The `<Notebook>`
  // dispatches an `ask-action` CustomEvent (same contract as the Ask
  // page); we upload the PNG data URL via the shared `uploadDataUrlAsMedia`
  // helper and hand the resulting media id to `chat.requestWithMedia`, so
  // the tutor's reply lands in the stream comparing the drawing against
  // the current section. No student bubble is shown — the tap on Check
  // isn't an utterance, matching the Ask-page pattern.
  // Destructure only the piece we actually need so the effect below doesn't
  // detach + re-attach on every unrelated `chat` object change (identity
  // shifts whenever `isSending` flips).
  const { requestWithMedia } = chat
  const chatErrorText = t('chatViewChatError')
  useEffect(() => {
    const handler = async (e: Event) => {
      // `ask-action` is a bare CustomEvent on `window`; anything on the page
      // could dispatch a plain Event with no `.detail`. Guard before use.
      const detail = (e as CustomEvent).detail as
        { type?: string; title?: string; imageData?: string } | null | undefined
      if (!detail || detail.type !== 'check' || !detail.imageData) return

      try {
        const mediaId = await uploadDataUrlAsMedia(detail.imageData, 'notebook.png')
        requestWithMedia(
          `The student drew a solution on the notebook canvas for "${detail.title ?? 'this exercise'}". Look at the attached image and tell them whether their approach and answer look correct. Be encouraging and supportive.`,
          [mediaId],
        )
      } catch (error) {
        logger.error({ err: error }, 'Notebook check-solution upload failed')
        append({
          key: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind: 'chat-error',
          text: chatErrorText,
        })
      }
    }
    window.addEventListener('ask-action', handler)
    return () => window.removeEventListener('ask-action', handler)
  }, [requestWithMedia, append, chatErrorText])

  const handleReset = useCallback(() => {
    cancelPendingAdvance()
    tts.cancel()
    // Wipe persistence BEFORE remount — the fresh ActiveChat reads
    // localStorage during its first render via useState lazy-init, so an
    // uncleared entry would resurrect the walker at the just-reset position.
    // Also drop every exercise's answers + solved-outcome bundle for this
    // lesson; otherwise the student lands on exercise 1 section 1 with the
    // previous run's green checkmarks still painted on the question cards.
    clearProgress()
    exercises.forEach((ex) => clearExerciseState(ex.id))
    onExit()
  }, [cancelPendingAdvance, clearProgress, exercises, onExit, tts])

  // The LessonMenu dropdown's restart entry (published from
  // ChatLessonView) fires `CHAT_LESSON_RESET_EVENT` instead of calling a
  // prop callback, so the reset logic can stay here where every hook it
  // needs is already in scope. Keep the handler in a ref so the listener
  // identity stays stable across renders.
  const resetRef = useRef(handleReset)
  resetRef.current = handleReset
  useEffect(() => {
    const handler = () => resetRef.current()
    window.addEventListener(CHAT_LESSON_RESET_EVENT, handler)
    return () => window.removeEventListener(CHAT_LESSON_RESET_EVENT, handler)
  }, [])

  const showContinueButton = !walker.isComplete && entries.length > 0

  // Given-data blocks for the current EXERCISE — top-level only (pre-section
  // content.blocks) with answer-required blocks filtered out via the same
  // `isAnswerRequired` predicate the walker uses for its intro entry.
  // Sharing the predicate keeps the floating pill and the inline amber
  // card in lockstep across future block-type additions.
  const currentExerciseGivenDataBlocks = useMemo<ContentBlock[]>(() => {
    const exercise = walker.currentStep?.exercise
    if (!exercise) return []
    const topLevel = getExerciseBlockGroups(exercise).find((g) => g.sectionIndex === null)
    if (!topLevel) return []
    return topLevel.blocks.filter((b: ContentBlock) => !isAnswerRequired(b))
  }, [walker.currentStep?.exercise])
  const currentExerciseKey = walker.currentStep?.exercise.id ?? ''

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-muted px-4 pt-16 pb-28 md:px-6 md:pt-20 md:pb-32">
        <div className="max-w-2xl mx-auto flex flex-col gap-content-gap" dir="rtl">
          {entries.map((entry) => (
            <StreamEntryView
              key={entry.key}
              entry={entry}
              isActive={entry.key === activeStepKey}
              lessonId={lessonId}
              mediaMap={mediaMap}
              tts={tts}
              onOutcome={handleOutcome}
              onQuickAction={handleQuickAction}
              onHintRequest={chat.isQuotaExhausted ? undefined : handleHintRequest}
              retryHintLabel={retryHintLabel}
              quickActionLabels={quickActionLabels}
              quickActionsDisabled={chat.isSending}
              freeResponsePlaceholder={t('chatViewAnswerPlaceholder')}
              freeResponseSendLabel={t('chatViewSendLabel')}
              introPrefix={t('chatViewIntroPrefix')}
              completeText={t('chatViewFinishTitle')}
              quotaExhaustedBody={t('chatViewQuotaExhaustedBody')}
              quotaUpgradeLabel={t('chatViewQuotaUpgradeCta')}
              quotaContinueLabel={t('chatViewQuotaContinueCta')}
            />
          ))}
          {showContinueButton && (
            <ContinueButton disabled={chat.isSending} isEnd={false} onClick={advanceNow} />
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </main>

      <ChatInputPanel
        isSending={chat.isSending}
        placeholder={t('chatViewInputPlaceholder')}
        sendLabel={t('chatViewSendLabel')}
        onSubmit={chat.send}
      />

      <ChatLessonProgress
        stepIndex={walker.stepCursor}
        currentExerciseOrdinal={walker.currentExerciseOrdinal}
        totalExercises={walker.totalExercises}
        lessonTitle={lessonTitle}
        exerciseLabel={t('chatViewProgressExercise')}
      />

      <GivenDataFloating
        blocks={currentExerciseGivenDataBlocks}
        mediaMap={mediaMap}
        exerciseKey={currentExerciseKey}
        showLabel={t('chatViewGivenDataShow')}
        hideLabel={t('chatViewGivenDataHide')}
        title={t('chatViewGivenDataTitle')}
        emptyLabel={t('chatViewGivenDataEmpty')}
      />

      {/* No global notebook FAB — each question block owns its own
          notebook via `QuestionCard.notebookContextTitle`. The
          ask-action listener above still picks up their dispatches. */}
    </>
  )
}

interface StreamEntryViewProps {
  entry: StreamEntry
  /** True only for the walker's current step. Locks stale scroll-back bubbles. */
  isActive: boolean
  lessonId: string
  mediaMap?: Record<string, Media>
  tts: ReturnType<typeof useBrowserTTS>
  onOutcome: (sectionKey: string, outcome: SectionOutcome) => void
  onQuickAction: (action: 'hint' | 'explain' | 'skip' | 'skipExercise') => void
  /**
   * Task-3 retry hint callback. Undefined when the student's chat quota is
   * exhausted (Task 7) — the question-level hint CTA relies on this prop's
   * presence to decide whether to render, so dropping it there auto-hides
   * the hint on retry sections.
   */
  onHintRequest?: (blockId: string, wrongChoiceText: string, correctChoiceText: string) => void
  retryHintLabel: string
  quickActionLabels: { hint: string; explain: string; skip: string; skipExercise: string }
  quickActionsDisabled: boolean
  freeResponsePlaceholder: string
  freeResponseSendLabel: string
  introPrefix: string
  completeText: string
  /** Copy + CTAs for the one-time Task-7 quota-exhausted card. */
  quotaExhaustedBody: string
  quotaUpgradeLabel: string
  quotaContinueLabel: string
}

function StreamEntryView({
  entry,
  isActive,
  lessonId,
  mediaMap,
  tts,
  onOutcome,
  onQuickAction,
  onHintRequest,
  retryHintLabel,
  quickActionLabels,
  quickActionsDisabled,
  freeResponsePlaceholder,
  freeResponseSendLabel,
  introPrefix,
  completeText,
  quotaExhaustedBody,
  quotaUpgradeLabel,
  quotaContinueLabel,
}: StreamEntryViewProps) {
  switch (entry.kind) {
    case 'exercise-intro': {
      const label = entry.title
        ? `${introPrefix} ${entry.ordinal}: ${entry.title}`
        : `${introPrefix} ${entry.ordinal}`
      const givenDataBlocks = entry.givenDataBlocks ?? []
      return (
        <div className="flex flex-col gap-content-gap">
          <TeacherBubble
            text={label}
            onSpeak={() => tts.speak(label)}
            speaking={tts.speaking}
            muted={tts.muted}
            ttsSupported={tts.supported}
          />
          {givenDataBlocks.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning/8 p-card-padding-sm shadow-elevation-1">
              <ExerciseRenderer
                groups={[{ blocks: givenDataBlocks, sectionIndex: null }]}
                mediaMap={mediaMap ?? EMPTY_MEDIA_MAP}
                lessonId={lessonId}
                showCheckAnswer={false}
                showExerciseNumber={false}
                questionCardVariant="flat"
              />
            </div>
          )}
        </div>
      )
    }
    case 'exercise-section':
      return (
        <ExerciseSectionBubble
          exercise={entry.exercise}
          ordinal={entry.ordinal}
          group={entry.group}
          questionLabels={entry.questionLabels}
          questionCount={entry.questionCount}
          lessonId={lessonId}
          mediaMap={mediaMap}
          speaking={tts.speaking}
          muted={tts.muted}
          ttsSupported={tts.supported}
          isActive={isActive}
          sectionKey={entry.key}
          onOutcome={onOutcome}
          onQuickAction={onQuickAction}
          onHintRequest={onHintRequest}
          retryHintLabel={retryHintLabel}
          quickActionLabels={quickActionLabels}
          quickActionsDisabled={quickActionsDisabled}
          freeResponsePlaceholder={freeResponsePlaceholder}
          freeResponseSendLabel={freeResponseSendLabel}
        />
      )
    case 'chat-user':
      return <StudentBubble text={entry.text} isCorrect={entry.isCorrect} />
    case 'chat-assistant':
      return (
        <TeacherBubble
          text={entry.text}
          onSpeak={() => tts.speak(entry.text)}
          speaking={tts.speaking}
          muted={tts.muted}
          ttsSupported={tts.supported}
        />
      )
    case 'chat-pending':
      return <PendingBubble />
    case 'chat-error':
      return <TeacherBubble text={entry.text} variant="correction" />
    case 'lesson-complete':
      return <TeacherBubble text={completeText} />
    case 'tier-lock':
      return <TierLockBubble lockedCount={entry.lockedCount} />
    case 'skipped-marker':
      return <SkippedMarker />
    case 'quota-exhausted':
      return (
        <QuotaExhaustedCard
          bodyText={quotaExhaustedBody}
          upgradeLabel={quotaUpgradeLabel}
          continueLabel={quotaContinueLabel}
          upgradeHref="/products"
        />
      )
  }
}
