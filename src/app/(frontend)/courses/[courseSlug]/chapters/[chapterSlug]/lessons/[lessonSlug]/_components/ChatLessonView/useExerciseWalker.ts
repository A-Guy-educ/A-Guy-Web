/**
 * @fileType hook
 * @domain lessons
 * @ai-summary Walks the lesson's exercises section-by-section for the Chat
 *             view. Each exercise is flattened into its ExerciseBlockGroup
 *             list (via getExerciseBlockGroups) up-front; the walker then
 *             advances one group at a time. Each exercise emits one intro
 *             bubble before its first group; the terminal bubble is emitted
 *             after the last group of the last exercise.
 *
 *             The parent owns the stream entries array; this hook just
 *             dispatches append() calls at the right moments. Chat channel
 *             entries (student questions + AI replies) share the same
 *             entries state and interleave naturally by insertion order.
 */

'use client'

import type { Exercise } from '@/infra/types/content'
import type { ContentBlock, ExerciseBlockGroup } from '@/infra/types/exercise'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StreamEntry } from './types'

/**
 * Block types that always require the student to submit an answer. These
 * stay in their own section walker step so their answer UI renders.
 * Non-interactive display blocks (rich_text, static svg, latex, html,
 * media, display-only axis/geometry graphs) fall into "given data" and
 * move into the intro card.
 */
const ALWAYS_ANSWER_REQUIRED_BLOCK_TYPES = new Set([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
])

/**
 * `svg` is a display type by default, but SVGBlock supports interactive
 * hotspots (`interactive: true` with a non-empty `hotspots` array + a
 * `correctHotspotIds` grading rule — see SvgBlock in `types.ts`). When
 * that's the case ExerciseRenderer renders it inside a graded
 * QuestionCard, so we must treat it as answer-required. Static SVG
 * figures (no `interactive` flag) stay in given data.
 */
function isInteractiveSvg(block: { type: string; [key: string]: unknown }): boolean {
  if (block.type !== 'svg') return false
  const interactive = (block as { interactive?: boolean }).interactive === true
  const hotspots = (block as { hotspots?: unknown[] }).hotspots
  return interactive && Array.isArray(hotspots) && hotspots.length > 0
}

/**
 * Whether a block needs an answer input. Shared by the walker (to decide
 * which groups keep a walker step) and by ChatLessonRunnerView (to
 * derive the pill's given-data set). Kept in one place so the pill and
 * the intro card never drift apart on a future block-type addition.
 */
export function isAnswerRequired(block: { type: string; [key: string]: unknown }): boolean {
  if (ALWAYS_ANSWER_REQUIRED_BLOCK_TYPES.has(block.type)) return true
  return isInteractiveSvg(block)
}

/**
 * Pull the exercise's top-level (pre-section) non-answer-required blocks.
 * These are the "given data" — statement, figures, graphs, formulas — that
 * live directly on the exercise before any section. Per-section content is
 * intentionally excluded so the intro card doesn't duplicate what renders
 * in its own section bubble.
 */
function extractGivenDataBlocks(exercise: Exercise): ContentBlock[] {
  const groups = getExerciseBlockGroups(exercise)
  const topLevel = groups.find((g) => g.sectionIndex === null)
  if (!topLevel) return []
  return topLevel.blocks.filter((b: ContentBlock) => !isAnswerRequired(b))
}

/** Block types that require the student to submit an answer. */
const QUESTION_BLOCK_TYPES = new Set([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
  'question_geometry',
  'question_axis',
])

interface WalkerStep {
  exerciseIndex: number
  ordinal: number
  exercise: Exercise
  group: ExerciseBlockGroup
  /** Index of this group WITHIN the exercise (0-based). */
  groupIndex: number
  /** Number of groups the exercise has (used to know when to emit the intro). */
  groupsInExercise: number
  questionCount: number
}

function flattenSteps(exercises: Exercise[]): WalkerStep[] {
  const out: WalkerStep[] = []
  exercises.forEach((exercise, exerciseIndex) => {
    // Reshape the top-level (sectionIndex === null) group so display blocks
    // never render twice:
    //   1. Skip the group entirely when it has no answer-required blocks
    //      AND the exercise has at least one section — its display blocks
    //      already surface in the intro amber card, and the sections keep
    //      the stream moving. Skipping this case avoids duplicating
    //      statements/figures/graphs across intro card + section bubble.
    //   2. When there are NO sections either, keep the top-level group as
    //      the walker step even if it's display-only — otherwise the
    //      whole exercise would vanish from the stream.
    //   3. When the group has answer-required blocks (either the
    //      always-required types or an interactive-hotspot SVG), keep the
    //      walker step but STRIP the display blocks off it — those live
    //      in the intro card, so re-rendering them inside the section
    //      bubble via ExerciseRenderer would double them.
    const rawGroups = getExerciseBlockGroups(exercise)
    const hasSections = rawGroups.some((g) => g.sectionIndex !== null)
    const groups = rawGroups
      .filter((g) => {
        if (g.sectionIndex !== null) return true
        if (g.blocks.some(isAnswerRequired)) return true
        return !hasSections
      })
      .map((g) => {
        if (g.sectionIndex !== null) return g
        if (!g.blocks.some(isAnswerRequired)) return g
        return { ...g, blocks: g.blocks.filter(isAnswerRequired) }
      })
    const groupsInExercise = groups.length
    if (groupsInExercise === 0) return
    groups.forEach((group, groupIndex) => {
      const questionCount = group.blocks.filter((b) =>
        QUESTION_BLOCK_TYPES.has(b.type as string),
      ).length
      out.push({
        exerciseIndex,
        ordinal: exerciseIndex + 1,
        exercise,
        group,
        groupIndex,
        groupsInExercise,
        questionCount,
      })
    })
  })
  return out
}

interface UseExerciseWalkerArgs {
  exercises: Exercise[]
  append: (entry: StreamEntry) => void
}

export function useExerciseWalker({ exercises, append }: UseExerciseWalkerArgs) {
  const steps = useMemo(() => flattenSteps(exercises), [exercises])
  const [stepCursor, setStepCursor] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const seededRef = useRef(false)

  const emitStep = useCallback(
    (idx: number) => {
      const step = steps[idx]
      if (!step) return
      // Prefix each exercise with a single intro bubble (before its first group).
      if (step.groupIndex === 0) {
        const givenDataBlocks = extractGivenDataBlocks(step.exercise)
        append({
          key: `intro-${step.exercise.id}`,
          kind: 'exercise-intro',
          exerciseIndex: step.exerciseIndex,
          ordinal: step.ordinal,
          title: step.exercise.title ?? undefined,
          givenDataBlocks: givenDataBlocks.length > 0 ? givenDataBlocks : undefined,
        })
      }
      append({
        key: `sec-${step.exercise.id}-${step.groupIndex}`,
        kind: 'exercise-section',
        exerciseIndex: step.exerciseIndex,
        ordinal: step.ordinal,
        exercise: step.exercise,
        group: step.group,
        questionCount: step.questionCount,
      })
    },
    [append, steps],
  )

  // Seed the first step once, guarded so React 18 strict-mode double
  // invocation doesn't re-emit.
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (steps.length === 0) {
      setIsComplete(true)
      append({ key: 'lesson-complete', kind: 'lesson-complete' })
      return
    }
    emitStep(0)
  }, [append, emitStep, steps.length])

  const advance = useCallback(() => {
    if (isComplete) return
    const next = stepCursor + 1
    if (next >= steps.length) {
      setIsComplete(true)
      append({ key: 'lesson-complete', kind: 'lesson-complete' })
      return
    }
    setStepCursor(next)
    emitStep(next)
  }, [append, emitStep, isComplete, stepCursor, steps.length])

  const currentStep = steps[stepCursor] ?? null

  // Total distinct exercises drives the "Exercise X/Y" label in the progress
  // footer. Derived here so the progress component doesn't have to hold onto
  // the full exercises array.
  const totalExercises = useMemo(() => exercises.length, [exercises.length])

  return {
    currentStep,
    /** 0-based cursor into the flattened step list — drives the progress bar. */
    stepCursor,
    totalSteps: steps.length,
    /** 1-based exercise ordinal at the current step (0 when no current step). */
    currentExerciseOrdinal: currentStep?.ordinal ?? 0,
    /** Total number of exercises in the lesson. */
    totalExercises,
    /** 1-based section index WITHIN the current exercise. */
    currentSectionOrdinal: currentStep ? currentStep.groupIndex + 1 : 0,
    /** Total sections in the current exercise. */
    currentExerciseSections: currentStep?.groupsInExercise ?? 0,
    isComplete,
    advance,
  }
}
