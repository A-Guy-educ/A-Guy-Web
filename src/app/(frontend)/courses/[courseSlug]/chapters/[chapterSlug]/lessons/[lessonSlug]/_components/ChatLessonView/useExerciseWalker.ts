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
import { computeQuestionLabels, computeSectionLabels } from '@/lib/exercises/computeSectionLabels'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isSectionEligibleForReview } from './reviewEligibility'
import type { StreamEntry } from './types'

/**
 * localStorage namespace used for Task-5 review-mode submissions. Child
 * bubbles honor it as `exerciseId`, so a review re-attempt writes to
 * `a-guy:exercise-state:v1:review-<original>` without touching the first
 * pass's answers, retry state, or submission history.
 */
const REVIEW_STORAGE_PREFIX = 'review-'

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
  // Display-only exercise (no sections + no answer-required at top level):
  // the walker keeps the top-level group as its sole step (see the
  // filter/map below), so surfacing the same display blocks in the intro
  // amber card would render them twice. The show-data pill still gets
  // them via ChatLessonRunnerView's `currentExerciseGivenDataBlocks` — the
  // pill is opt-in on-tap, so no duplication there.
  const hasSections = groups.some((g) => g.sectionIndex !== null)
  const topLevelHasAnswerRequired = topLevel.blocks.some(isAnswerRequired)
  if (!hasSections && !topLevelHasAnswerRequired) return []
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
  /**
   * Exercise-wide section label (`א`, `ד3`, …). Computed from the FULL
   * group list (before walker filtering) so titled subsections keep their
   * label regardless of which groups the walker chose to skip.
   */
  sectionLabel: string
  /** Exercise-wide `block.id → label` map (shared identity across the exercise's steps). */
  questionLabels: Map<string, string>
}

function flattenSteps(exercises: Exercise[], isHebrew: boolean): WalkerStep[] {
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
    const rawSectionLabels = computeSectionLabels(rawGroups, isHebrew)
    // One shared question-label map per exercise — passed by reference into
    // every step for this exercise so ExerciseRenderer's useMemo dep list
    // stays stable across walker advances and StreamEntryView re-renders.
    const questionLabels = computeQuestionLabels(rawGroups, isHebrew)
    // Map each raw group (by reference) to its section label so the walker
    // can look up the same label after filtering + reshaping the group list
    // below (spread + filter break reference equality; sectionIndex identifies
    // sections uniquely, and `null` covers the single preamble group).
    const labelByGroupKey = new Map<number | null, string>()
    rawGroups.forEach((g, idx) => {
      labelByGroupKey.set(g.sectionIndex, rawSectionLabels[idx] ?? '')
    })
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
        sectionLabel: labelByGroupKey.get(group.sectionIndex) ?? '',
        questionLabels,
      })
    })
  })
  return out
}

interface UseExerciseWalkerArgs {
  exercises: Exercise[]
  append: (entry: StreamEntry) => void
  /** Locale flag for the section label alphabet — Hebrew (`א/ב/ג`) vs Latin (`a/b/c`). */
  isHebrew: boolean
  /**
   * Walker step to resume from on seed. When set, the seed effect emits every
   * intro+section from 0 through this index so the stream picks up at the
   * student's saved section. Null / out-of-range values fall back to 0 (fresh
   * start) — important when a lesson's exercises change between visits and the
   * saved cursor no longer points at a real step.
   */
  initialStepCursor?: number | null
  /**
   * When `exercises` has already been clamped by a tier gate, pass the
   * original un-clamped count so the terminal bubble can announce how many
   * exercises are gated behind an upgrade. Null / undefined / equal-to-length
   * means "no clamping" and the walker emits the normal `lesson-complete`
   * terminator instead of `tier-lock`.
   */
  totalExercisesBeforeTierCap?: number | null
}

export function useExerciseWalker({
  exercises,
  append,
  isHebrew,
  initialStepCursor,
  totalExercisesBeforeTierCap,
}: UseExerciseWalkerArgs) {
  const steps = useMemo(() => flattenSteps(exercises, isHebrew), [exercises, isHebrew])
  const resumeCursor =
    typeof initialStepCursor === 'number' &&
    initialStepCursor >= 0 &&
    initialStepCursor < steps.length
      ? initialStepCursor
      : 0
  const [stepCursor, setStepCursor] = useState(resumeCursor)
  const [isComplete, setIsComplete] = useState(false)
  const seededRef = useRef(false)

  // Task-5 review-mode state. `reviewSteps` is the eligibility-filtered
  // slice of `steps` emitted after the student taps "yes" on the review
  // offer; `reviewCursor` is 0-based into THAT slice (independent of
  // `stepCursor`, which stays frozen at the normal-mode last position).
  const [mode, setMode] = useState<'normal' | 'review'>('normal')
  const [reviewSteps, setReviewSteps] = useState<WalkerStep[]>([])
  const [reviewCursor, setReviewCursor] = useState(0)

  // How many exercises were trimmed off the end by the caller's tier gate.
  // Positive → terminal entry is `tier-lock`; otherwise `lesson-complete`.
  const lockedExerciseCount =
    typeof totalExercisesBeforeTierCap === 'number'
      ? Math.max(0, totalExercisesBeforeTierCap - exercises.length)
      : 0
  const makeTerminalEntry = useCallback(
    (): StreamEntry =>
      lockedExerciseCount > 0
        ? { key: 'tier-lock', kind: 'tier-lock', lockedCount: lockedExerciseCount }
        : { key: 'lesson-complete', kind: 'lesson-complete' },
    [lockedExerciseCount],
  )

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
        sectionLabel: step.sectionLabel,
        questionLabels: step.questionLabels,
      })
    },
    [append, steps],
  )

  /**
   * Review-mode emitter. Mirrors `emitStep` but:
   *   - Keys are prefixed `review-intro-` / `review-sec-` so the same section
   *     can appear twice in the stream (once from the original pass, once in
   *     review) without React key collisions.
   *   - Sets `storageIdOverride` so child bubbles write to the review
   *     localStorage namespace instead of overwriting the original attempt.
   */
  const emitReviewStep = useCallback(
    (idx: number, slice: WalkerStep[]) => {
      const step = slice[idx]
      if (!step) return
      const storageIdOverride = `${REVIEW_STORAGE_PREFIX}${step.exercise.id}`
      if (step.groupIndex === 0) {
        const givenDataBlocks = extractGivenDataBlocks(step.exercise)
        append({
          key: `review-intro-${step.exercise.id}`,
          kind: 'exercise-intro',
          exerciseIndex: step.exerciseIndex,
          ordinal: step.ordinal,
          title: step.exercise.title ?? undefined,
          givenDataBlocks: givenDataBlocks.length > 0 ? givenDataBlocks : undefined,
        })
      }
      append({
        key: `review-sec-${step.exercise.id}-${step.groupIndex}`,
        kind: 'exercise-section',
        exerciseIndex: step.exerciseIndex,
        ordinal: step.ordinal,
        exercise: step.exercise,
        group: step.group,
        questionCount: step.questionCount,
        sectionLabel: step.sectionLabel,
        questionLabels: step.questionLabels,
        storageIdOverride,
      })
    },
    [append],
  )

  // Seed the walker once, guarded so React 18 strict-mode double invocation
  // doesn't re-emit. When resuming from a saved cursor we replay every intro
  // and section from 0 up to (and including) that cursor so the stream mirrors
  // what the student saw before leaving.
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (steps.length === 0) {
      setIsComplete(true)
      append(makeTerminalEntry())
      return
    }
    for (let i = 0; i <= resumeCursor; i++) emitStep(i)
  }, [append, emitStep, resumeCursor, steps.length, makeTerminalEntry])

  const advance = useCallback(() => {
    if (isComplete) return
    if (mode === 'review') {
      const next = reviewCursor + 1
      if (next >= reviewSteps.length) {
        setIsComplete(true)
        append(makeTerminalEntry())
        return
      }
      setReviewCursor(next)
      emitReviewStep(next, reviewSteps)
      return
    }
    const next = stepCursor + 1
    if (next >= steps.length) {
      // End of normal walk — if any section needs review, defer the terminator
      // and let the student choose; otherwise fire the terminator as before.
      const eligible = steps.filter((s) => isSectionEligibleForReview(s.exercise, s.group))
      if (eligible.length > 0) {
        append({ key: 'review-offer', kind: 'review-offer' })
        return
      }
      setIsComplete(true)
      append(makeTerminalEntry())
      return
    }
    setStepCursor(next)
    emitStep(next)
  }, [
    append,
    emitStep,
    emitReviewStep,
    isComplete,
    makeTerminalEntry,
    mode,
    reviewCursor,
    reviewSteps,
    stepCursor,
    steps,
  ])

  /**
   * Enter Task-5 review mode. Collects eligible-review sections from the full
   * step list (sections where the student answered wrong, used a hint, or had
   * AI validation skipped), flips the cursor into a dedicated review-cursor,
   * and emits the first review step. No-op when nothing is eligible — the
   * runner shouldn't offer the button in that case, but guarding here keeps
   * a stray tap safe.
   */
  const startReview = useCallback(() => {
    if (isComplete) return
    const eligible = steps.filter((s) => isSectionEligibleForReview(s.exercise, s.group))
    if (eligible.length === 0) return
    setMode('review')
    setReviewSteps(eligible)
    setReviewCursor(0)
    emitReviewStep(0, eligible)
  }, [emitReviewStep, isComplete, steps])

  /**
   * "סיום" path from the review offer card — skip the review and fire the
   * terminator immediately. Also used by the runner to short-circuit a
   * walker that's parked on `review-offer`.
   */
  const completeLesson = useCallback(() => {
    if (isComplete) return
    setIsComplete(true)
    append(makeTerminalEntry())
  }, [append, isComplete, makeTerminalEntry])

  /**
   * Skip every remaining step of the current exercise and land on the first
   * step of the next exercise. If there is no next exercise, terminate the
   * lesson (same terminator as a natural `advance` past the end). No chat
   * roundtrip — this is a pure walker jump; skipped sections stay in the
   * stream above the student exactly as the "skip section" button leaves
   * previously-visited sections. Prior answers are preserved by virtue of
   * the walker never removing or rewriting past stream entries.
   *
   * Also emits a `skipped-marker` entry between the current (last answered)
   * section and the next exercise's intro so the walker's jump isn't silent —
   * the spec explicitly asks skipped sections to be "marked as skipped"
   * without reopening them.
   */
  const advanceToNextExercise = useCallback(() => {
    if (isComplete) return
    const current = steps[stepCursor]
    if (!current) return
    const target = steps.findIndex(
      (s, i) => i > stepCursor && s.exerciseIndex > current.exerciseIndex,
    )
    // Marker key is unique per invocation so a second skip later in the
    // lesson doesn't collide with the first one. Fires before the terminator
    // / next step so it visually sits between the two.
    const markerKey = `skip-${current.exercise.id}-${current.groupIndex}-${Date.now()}`
    append({ key: markerKey, kind: 'skipped-marker' })
    if (target === -1) {
      // Last exercise — same end-of-lesson handling as normal `advance`: if
      // ANY earlier section qualifies for review (Task 5), defer the
      // terminator and emit the offer card instead. Previously this path
      // bypassed the check, so a student who skipped the last exercise
      // never got the review prompt even after missing stuff earlier.
      const eligible = steps.filter((s) => isSectionEligibleForReview(s.exercise, s.group))
      if (eligible.length > 0) {
        append({ key: 'review-offer', kind: 'review-offer' })
        return
      }
      setIsComplete(true)
      append(makeTerminalEntry())
      return
    }
    setStepCursor(target)
    emitStep(target)
  }, [append, emitStep, isComplete, steps, stepCursor, makeTerminalEntry])

  // The visible "current step" depends on mode: normal mode reads the main
  // cursor, review mode reads the filtered slice.
  const currentStep =
    mode === 'review' ? (reviewSteps[reviewCursor] ?? null) : (steps[stepCursor] ?? null)
  // Stream key of the currently-active bubble. Review steps are keyed with
  // the `review-sec-` prefix so the student's second attempt doesn't collide
  // with the original section's bubble (which stays visible in scrollback).
  const currentStepKey = currentStep
    ? `${mode === 'review' ? 'review-sec-' : 'sec-'}${currentStep.exercise.id}-${currentStep.groupIndex}`
    : null

  // Total distinct exercises drives the "Exercise X/Y" label in the progress
  // footer. Derived here so the progress component doesn't have to hold onto
  // the full exercises array.
  const totalExercises = useMemo(() => exercises.length, [exercises.length])

  return {
    currentStep,
    /** Stream key of the current step — matches the entry.key the walker emitted. */
    currentStepKey,
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
    /** True while the walker is iterating the Task-5 review slice. */
    isReviewing: mode === 'review',
    advance,
    advanceToNextExercise,
    startReview,
    completeLesson,
  }
}
