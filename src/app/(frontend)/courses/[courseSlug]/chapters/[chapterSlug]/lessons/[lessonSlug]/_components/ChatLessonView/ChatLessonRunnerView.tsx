'use client'

import type { Exercise, Media } from '@/infra/types/content'
import type { RichTextBlock } from '@/infra/types/exercise'
import { getExerciseBlocks } from '@/lib/exercises/getExerciseBlocks'
import { formatExerciseContextMessage } from '@/infra/llm/exercise-context'
import { uploadDataUrlAsMedia } from '@/infra/media/uploadDataUrl'
import { logger } from '@/infra/utils/logger'
import { useTranslations } from '@/ui/web/providers/I18n'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatInputPanel } from './ChatInputPanel'
import { ChatLessonProgress } from './ChatLessonProgress'
import { ChatLessonStartCard } from './ChatLessonStartCard'
import { GivenDataFloating } from './GivenDataFloating'
import { ContinueButton } from './bubbles/ContinueButton'
import { ExerciseSectionBubble } from './bubbles/ExerciseSectionBubble'
import { PendingBubble } from './bubbles/PendingBubble'
import { StudentBubble } from './bubbles/StudentBubble'
import { TeacherBubble } from './bubbles/TeacherBubble'
import type { SectionOutcome, StreamEntry } from './types'
import { useBrowserTTS } from './useBrowserTTS'
import { useChatChannel } from './useChatChannel'
import { useExerciseWalker } from './useExerciseWalker'
import { pickWellDone } from './wellDoneMessages'

const CELEBRATION_ADVANCE_MS = 1500

/** א, ב, ג, ... — matches the ExerciseRenderer's question-card labeling. */
const HEBREW_LETTERS = [
  'א',
  'ב',
  'ג',
  'ד',
  'ה',
  'ו',
  'ז',
  'ח',
  'ט',
  'י',
  'כ',
  'ל',
  'מ',
  'נ',
  'ס',
  'ע',
  'פ',
  'צ',
  'ק',
  'ר',
  'ש',
  'ת',
]

interface ChatLessonRunnerViewProps {
  lessonTitle: string
  lessonId: string
  exercises: Exercise[]
  mediaMap?: Record<string, Media>
  /** TTS instance hoisted from the parent (ChatLessonView) so its mute
   *  state can also drive the LessonMenu's mute item. */
  tts: ReturnType<typeof useBrowserTTS>
}

export function ChatLessonRunnerView(props: ChatLessonRunnerViewProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const t = useTranslations('courses')

  if (!hasStarted) {
    return (
      <div className="flex-1 overflow-y-auto bg-muted">
        <ChatLessonStartCard
          lessonTitle={props.lessonTitle}
          exerciseCount={props.exercises.length}
          startLabel={t('chatViewStart')}
          exercisesCountLabel={t('chatViewExercisesCount')}
          onStart={() => setHasStarted(true)}
        />
      </div>
    )
  }

  return <ActiveChat {...props} onExit={() => setHasStarted(false)} />
}

interface ActiveChatProps extends ChatLessonRunnerViewProps {
  onExit: () => void
}

function ActiveChat({ lessonId, exercises, mediaMap, tts, onExit }: ActiveChatProps) {
  const t = useTranslations('courses')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const [entries, setEntries] = useState<StreamEntry[]>([])
  const append = useCallback((entry: StreamEntry) => {
    setEntries((prev) => [...prev, entry])
  }, [])
  const replace = useCallback((key: string, entry: StreamEntry) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? entry : e)))
  }, [])

  const walker = useExerciseWalker({ exercises, append })
  const currentStep = walker.currentStep
  const currentExercise = currentStep?.exercise ?? null

  // Scope the AI's attention to the current section (not the whole exercise
  // or, worse, whatever exercise the shared lesson-conversation was last
  // talking about). Passing just the current group's blocks + a section-
  // annotated title keeps every chat request grounded in the section the
  // student is actually on.
  const currentExerciseContext = useMemo(() => {
    if (!currentStep) return null
    const { exercise, group, groupIndex } = currentStep
    const baseTitle = exercise.title?.trim() ?? ''
    const sectionLetter =
      group.sectionIndex !== null ? (HEBREW_LETTERS[groupIndex] ?? String(groupIndex + 1)) : null
    const title = sectionLetter ? `${baseTitle} — סעיף ${sectionLetter}`.trim() : baseTitle
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

  const correctionPrompt = t('chatViewCorrectionPrompt')
  const correctAnswerLabel = t('chatViewCorrectAnswerLabel')
  const handleOutcome = useCallback(
    (outcome: SectionOutcome) => {
      if (outcome.kind === 'correct') {
        append({
          key: `celebrate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind: 'chat-assistant',
          text: pickWellDone(),
        })
        cancelPendingAdvance()
        pendingAdvanceRef.current = setTimeout(() => {
          pendingAdvanceRef.current = null
          walker.advance()
        }, CELEBRATION_ADVANCE_MS)
      } else {
        // Post the correct-answer bubble immediately (from block data — no
        // model roundtrip), THEN kick off the AI explanation. Anchors the
        // student on the answer while the fuller correction is being
        // generated.
        if (outcome.correctAnswerText) {
          append({
            key: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            kind: 'chat-assistant',
            text: `${correctAnswerLabel}: ${outcome.correctAnswerText}`,
          })
        }
        chat.requestCorrection(correctionPrompt)
      }
    },
    [append, cancelPendingAdvance, chat, correctAnswerLabel, correctionPrompt, walker],
  )

  const handleQuestionSubmit = useCallback(
    (text: string, isCorrect: boolean) => {
      // Echo the student's answer as a right-side bubble; color is derived
      // from isCorrect so the "chose the correct option" and "chose wrong"
      // states are immediately visible even before the section outcome
      // fires the celebration or correction below.
      append({
        key: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'chat-user',
        text,
        isCorrect,
      })
    },
    [append],
  )

  // Quick-action chip dispatcher. Hint + explain go through the invisible
  // requestCorrection channel so only the AI reply lands in the stream
  // (no fake user bubble echoing our canned prompt). Skip just advances
  // the walker without any chat roundtrip.
  const hintPrompt = t('chatViewChipHintPrompt')
  const explainPrompt = t('chatViewChipExplainPrompt')
  const handleQuickAction = useCallback(
    (action: 'hint' | 'explain' | 'skip') => {
      if (action === 'skip') {
        advanceNow()
        return
      }
      chat.requestCorrection(action === 'hint' ? hintPrompt : explainPrompt)
    },
    [advanceNow, chat, explainPrompt, hintPrompt],
  )

  const quickActionLabels = useMemo(
    () => ({
      hint: t('chatViewChipHint'),
      explain: t('chatViewChipExplain'),
      skip: t('chatViewChipSkip'),
    }),
    [t],
  )

  // Key of the current walker step — used by StreamEntryView to mark the
  // matching bubble as "active". Historical bubbles (anything else) render
  // as read-only so scroll-back clicks can't dispatch through the runner
  // with the wrong context.
  const activeStepKey = walker.currentStep
    ? `sec-${walker.currentStep.exercise.id}-${walker.currentStep.groupIndex}`
    : null

  // Narration is click-only. Each TeacherBubble exposes an `onSpeak` button
  // (wired below to `tts.speak(...)`) so the student decides when to hear a
  // line. Auto-playing on entry arrival was removed per product request —
  // recordings stay available on demand.

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries.length])

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
        | { type?: string; title?: string; imageData?: string }
        | null
        | undefined
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
    onExit()
  }, [cancelPendingAdvance, onExit, tts])

  const showContinueButton = !walker.isComplete && entries.length > 0

  // Given-data rich_text blocks for the current EXERCISE (all sections).
  // Stays stable while the student walks through the exercise's sections
  // and only changes when they advance to the next exercise — so the
  // floating amber pill can show statement + figures without churning.
  const currentExerciseRichTextBlocks = useMemo<RichTextBlock[]>(() => {
    const exercise = walker.currentStep?.exercise
    if (!exercise) return []
    return getExerciseBlocks(exercise).filter((b): b is RichTextBlock => b.type === 'rich_text')
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
              onQuestionSubmit={handleQuestionSubmit}
              onQuickAction={handleQuickAction}
              quickActionLabels={quickActionLabels}
              quickActionsDisabled={chat.isSending}
              freeResponsePlaceholder={t('chatViewAnswerPlaceholder')}
              freeResponseSendLabel={t('chatViewSendLabel')}
              introPrefix={t('chatViewIntroPrefix')}
              completeText={t('chatViewFinishTitle')}
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
        totalSteps={walker.totalSteps}
        currentExerciseOrdinal={walker.currentExerciseOrdinal}
        totalExercises={walker.totalExercises}
        currentSectionOrdinal={walker.currentSectionOrdinal}
        currentExerciseSections={walker.currentExerciseSections}
        exerciseLabel={t('chatViewProgressExercise')}
        sectionLabel={t('chatViewProgressSection')}
        onReset={handleReset}
      />

      <GivenDataFloating
        richTextBlocks={currentExerciseRichTextBlocks}
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
  onOutcome: (outcome: SectionOutcome) => void
  onQuestionSubmit: (text: string, isCorrect: boolean) => void
  onQuickAction: (action: 'hint' | 'explain' | 'skip') => void
  quickActionLabels: { hint: string; explain: string; skip: string }
  quickActionsDisabled: boolean
  freeResponsePlaceholder: string
  freeResponseSendLabel: string
  introPrefix: string
  completeText: string
}

function StreamEntryView({
  entry,
  isActive,
  lessonId,
  mediaMap,
  tts,
  onOutcome,
  onQuestionSubmit,
  onQuickAction,
  quickActionLabels,
  quickActionsDisabled,
  freeResponsePlaceholder,
  freeResponseSendLabel,
  introPrefix,
  completeText,
}: StreamEntryViewProps) {
  switch (entry.kind) {
    case 'exercise-intro': {
      const label = entry.title
        ? `${introPrefix} ${entry.ordinal}: ${entry.title}`
        : `${introPrefix} ${entry.ordinal}`
      return (
        <TeacherBubble
          text={label}
          onSpeak={() => tts.speak(label)}
          speaking={tts.speaking}
          muted={tts.muted}
          ttsSupported={tts.supported}
        />
      )
    }
    case 'exercise-section':
      return (
        <ExerciseSectionBubble
          exercise={entry.exercise}
          ordinal={entry.ordinal}
          group={entry.group}
          questionCount={entry.questionCount}
          lessonId={lessonId}
          mediaMap={mediaMap}
          speaking={tts.speaking}
          muted={tts.muted}
          ttsSupported={tts.supported}
          isActive={isActive}
          onOutcome={onOutcome}
          onQuestionSubmit={onQuestionSubmit}
          onQuickAction={onQuickAction}
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
  }
}
