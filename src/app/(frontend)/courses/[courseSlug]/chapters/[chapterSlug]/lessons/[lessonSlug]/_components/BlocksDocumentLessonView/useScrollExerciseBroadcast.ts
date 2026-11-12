'use client'

import { useEffect, useMemo, useRef } from 'react'

import { formatExerciseContextMessage, type MediaItem } from '@/infra/llm/exercise-context'
import type { Exercise } from '@/infra/types/content'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { computeQuestionLabels } from '@/lib/exercises/computeSectionLabels'
import {
  publishScrollExercise,
  type ScrollExerciseContext,
} from '@/ui/web/chat/hooks/scroll-exercise-context'

/** Budget for one exercise's text; long exam questions need every section. */
const SCROLL_EXERCISE_MAX_CHARS = 6000

/**
 * Exercise section in view = the last one whose top has passed this fraction
 * of the viewport height (or the first section before any has).
 */
const VIEWPORT_ANCHOR = 0.35

export const SCROLL_EXERCISE_ATTR = 'data-scroll-exercise-id'

type FormatterBlock = { id: string; type: string; [key: string]: unknown }

/**
 * Flatten the worksheet groups for the formatter, inserting each question's
 * visible label ("סעיף ג3") before it so the tutor and the student refer to
 * the same parts.
 */
function blocksWithLabels(groups: ExerciseBlockGroup[], isRtl: boolean): FormatterBlock[] {
  const labels = computeQuestionLabels(groups, isRtl)
  return groups.flatMap((group) =>
    group.blocks.flatMap((block) => {
      const { id, type, ...rest } = block
      const label = labels.get(id)
      const formatted: FormatterBlock = { id, type, ...rest }
      if (!label) return [formatted]
      const labelBlock: FormatterBlock = {
        id: `label-${id}`,
        type: 'rich_text',
        format: 'md-math-v1',
        value: isRtl ? `סעיף ${label}:` : `Part ${label}:`,
        mediaIds: [],
      }
      return [labelBlock, formatted]
    }),
  )
}

export function buildScrollExerciseContexts(
  entries: Array<{ exercise: Exercise; groups: ExerciseBlockGroup[] }>,
  isRtl: boolean,
  mediaMap?: Record<string, MediaItem>,
): ScrollExerciseContext[] {
  return entries.map(({ exercise, groups }, index) => {
    const title = exercise.title?.trim() || `${index + 1}`
    return {
      exerciseId: exercise.id,
      title,
      position: index + 1,
      total: entries.length,
      content: formatExerciseContextMessage(
        title,
        blocksWithLabels(groups, isRtl),
        mediaMap,
        SCROLL_EXERCISE_MAX_CHARS,
      ),
    }
  })
}

function exerciseIdInView(): string | null {
  const sections = document.querySelectorAll<HTMLElement>(`[${SCROLL_EXERCISE_ATTR}]`)
  if (sections.length === 0) return null
  const anchor = window.innerHeight * VIEWPORT_ANCHOR
  let current = sections[0]
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= anchor) current = section
  }
  return current.getAttribute(SCROLL_EXERCISE_ATTR)
}

/**
 * Tell the chat which exercise the student is looking at in the scroll view
 * (the scroll-view counterpart of the PDF viewer's page events). Sections
 * must carry `SCROLL_EXERCISE_ATTR`. Publishes `null` on unmount.
 */
export function useScrollExerciseBroadcast(contexts: ScrollExerciseContext[]): void {
  const byId = useMemo(
    () => new Map(contexts.map((context) => [context.exerciseId, context])),
    [contexts],
  )
  const lastIdRef = useRef<string | null>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const id = exerciseIdInView()
      if (id === lastIdRef.current) return
      lastIdRef.current = id
      publishScrollExercise(id ? (byId.get(id) ?? null) : null)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    lastIdRef.current = null
    update()
    // Capture phase catches scrolls of any inner container (desktop pane)
    // as well as the page itself (mobile).
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      lastIdRef.current = null
      publishScrollExercise(null)
    }
  }, [byId])
}
