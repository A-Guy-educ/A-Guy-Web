/**
 * Help System Hook
 *
 * Manages per-question help state (hint → guiding → solution progression)
 * and emits system events for analytics tracking.
 *
 * Each help button walks through: idle → field-shown → ai-asked.
 *   - First click: show the pre-written content from the block field. If the
 *     field is empty, fall back to a Gemini call immediately and skip to
 *     ai-asked (nothing else to show).
 *   - Second click: ask Gemini for a different / deeper response, passing the
 *     pre-written content along as context so it doesn't repeat it. The
 *     button is disabled after this.
 */

'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { systemEventBus, SYSTEM_EVENTS } from '@/infra/system-events'
import type { HelpUsageState, QuestionBlock } from '../types'

interface UseHelpSystemProps {
  questionBlocks: QuestionBlock[]
  lessonId: string
  exerciseId: string
  locale?: string
}

interface UseHelpSystemReturn {
  helpUsage: Record<string, HelpUsageState>
  activeHelp: Record<string, 'hint' | 'guiding' | 'solution' | null>
  handleHintClick: (questionId: string) => void
  handleGuidingClick: (questionId: string) => void
  handleSolutionClick: (questionId: string) => void
}

const INITIAL_HELP_STATE: HelpUsageState = {
  hintShown: false,
  hintAiAsked: false,
  guidingUsed: false,
  guidingAiAsked: false,
  solutionUnlocked: false,
  solutionShown: false,
  solutionAiAsked: false,
}

type HelpActionDetail = {
  type: 'hint' | 'guiding' | 'solution'
  questionContent?: string
  backendContent?: string
  previousContent?: string
  exerciseId?: string
  lessonId?: string
}

function dispatchHelpAction(detail: HelpActionDetail): void {
  window.dispatchEvent(new CustomEvent('exercise-help-action', { detail }))
}

export function useHelpSystem({
  questionBlocks,
  lessonId,
  exerciseId,
  locale,
}: UseHelpSystemProps): UseHelpSystemReturn {
  const [helpUsage, setHelpUsage] = useState<Record<string, HelpUsageState>>({})
  const [activeHelp, setActiveHelp] = useState<
    Record<string, 'hint' | 'guiding' | 'solution' | null>
  >({})

  // Track which questions have had solution_unlocked emitted (fire-once)
  const unlockEmittedRef = useRef<Set<string>>(new Set())

  const questionIds = useMemo(() => questionBlocks.map((q) => q.id), [questionBlocks])

  const getHelpState = useCallback(
    (questionId: string): HelpUsageState => helpUsage[questionId] ?? INITIAL_HELP_STATE,
    [helpUsage],
  )

  const basePayload = useCallback(
    (questionId: string) => ({
      lesson_id: lessonId,
      exercise_id: exerciseId,
      question_id: questionId,
      locale,
    }),
    [lessonId, exerciseId, locale],
  )

  const maybeEmitUnlock = useCallback(
    (questionId: string, next: HelpUsageState) => {
      if (next.solutionUnlocked && !unlockEmittedRef.current.has(questionId)) {
        unlockEmittedRef.current.add(questionId)
        systemEventBus.emit(SYSTEM_EVENTS.SOLUTION_UNLOCKED, {
          ...basePayload(questionId),
          hint_used: true,
          guiding_used: true,
        })
      }
    },
    [basePayload],
  )

  const handleHintClick = useCallback(
    (questionId: string) => {
      if (!questionIds.includes(questionId)) return
      const current = getHelpState(questionId)
      if (current.hintAiAsked) return // button is exhausted
      const question = questionBlocks.find((q) => q.id === questionId)
      if (!question) return

      const backendHint = question.hint?.value
      const questionContent = question.prompt?.value

      setActiveHelp((prev) => ({ ...prev, [questionId]: 'hint' }))

      if (!current.hintShown) {
        // First click: show pre-written hint if we have one, otherwise call AI.
        const next: HelpUsageState = {
          ...current,
          hintShown: true,
          hintAiAsked: !backendHint,
          solutionUnlocked: current.guidingUsed,
        }
        setHelpUsage((prev) => ({ ...prev, [questionId]: next }))

        systemEventBus.emit(SYSTEM_EVENTS.HINT_CLICKED, {
          ...basePayload(questionId),
          hint_used: true,
        })

        if (!backendHint) {
          dispatchHelpAction({ type: 'hint', questionContent, exerciseId, lessonId })
        }

        maybeEmitUnlock(questionId, next)
        return
      }

      // Second click: pre-written hint already shown, ask AI for a different one.
      setHelpUsage((prev) => ({
        ...prev,
        [questionId]: { ...current, hintAiAsked: true },
      }))
      dispatchHelpAction({
        type: 'hint',
        questionContent,
        previousContent: backendHint,
        exerciseId,
        lessonId,
      })
    },
    [questionIds, getHelpState, questionBlocks, basePayload, maybeEmitUnlock, exerciseId, lessonId],
  )

  const handleGuidingClick = useCallback(
    (questionId: string) => {
      if (!questionIds.includes(questionId)) return
      const current = getHelpState(questionId)
      if (current.guidingAiAsked) return
      const question = questionBlocks.find((q) => q.id === questionId)
      if (!question) return

      const backendGuiding = question.solution?.value
      const questionContent = question.prompt?.value

      setActiveHelp((prev) => ({ ...prev, [questionId]: 'guiding' }))

      if (!current.guidingUsed) {
        // First click: ChatInterface posts backendContent as an assistant
        // message if present, otherwise it calls AI.
        const next: HelpUsageState = {
          ...current,
          guidingUsed: true,
          guidingAiAsked: !backendGuiding,
          solutionUnlocked: current.hintShown,
        }
        setHelpUsage((prev) => ({ ...prev, [questionId]: next }))

        systemEventBus.emit(SYSTEM_EVENTS.GUIDING_QUESTION_CLICKED, {
          ...basePayload(questionId),
          guiding_used: true,
        })

        dispatchHelpAction({
          type: 'guiding',
          questionContent,
          backendContent: backendGuiding,
          exerciseId,
          lessonId,
        })

        maybeEmitUnlock(questionId, next)
        return
      }

      // Second click: ask AI for a different guiding question, with the prior
      // one as context.
      setHelpUsage((prev) => ({
        ...prev,
        [questionId]: { ...current, guidingAiAsked: true },
      }))
      dispatchHelpAction({
        type: 'guiding',
        questionContent,
        previousContent: backendGuiding,
        exerciseId,
        lessonId,
      })
    },
    [questionIds, getHelpState, questionBlocks, basePayload, maybeEmitUnlock, exerciseId, lessonId],
  )

  const handleSolutionClick = useCallback(
    (questionId: string) => {
      if (!questionIds.includes(questionId)) return
      const current = getHelpState(questionId)
      if (!current.solutionUnlocked) return
      if (current.solutionAiAsked) return
      const question = questionBlocks.find((q) => q.id === questionId)
      if (!question) return

      const backendSolution = question.fullSolution?.value
      const questionContent = question.prompt?.value

      setActiveHelp((prev) => ({ ...prev, [questionId]: 'solution' }))

      systemEventBus.emit(SYSTEM_EVENTS.SOLUTION_CLICKED, {
        ...basePayload(questionId),
        hint_used: current.hintShown,
        guiding_used: current.guidingUsed,
      })

      if (!current.solutionShown) {
        // First click: show pre-written full solution if we have one,
        // otherwise call AI.
        setHelpUsage((prev) => ({
          ...prev,
          [questionId]: {
            ...current,
            solutionShown: true,
            solutionAiAsked: !backendSolution,
          },
        }))

        dispatchHelpAction({
          type: 'solution',
          questionContent,
          backendContent: backendSolution,
          exerciseId,
          lessonId,
        })
        return
      }

      // Second click: ask AI for a walkthrough, with the pre-written solution
      // as context.
      setHelpUsage((prev) => ({
        ...prev,
        [questionId]: { ...current, solutionAiAsked: true },
      }))
      dispatchHelpAction({
        type: 'solution',
        questionContent,
        previousContent: backendSolution,
        exerciseId,
        lessonId,
      })
    },
    [questionIds, getHelpState, questionBlocks, basePayload, exerciseId, lessonId],
  )

  return {
    helpUsage,
    activeHelp,
    handleHintClick,
    handleGuidingClick,
    handleSolutionClick,
  }
}
