'use client'

import { useEffect, useState } from 'react'

import type { Exercise, Media as MediaType } from '@/infra/types/content'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { SheetPreviewPanel } from '@/ui/web/chat-tools'
import {
  SCROLL_EXERCISE_EVENT,
  getPublishedScrollExercise,
  type ScrollExerciseEventDetail,
} from '@/ui/web/chat/hooks/scroll-exercise-context'
import { ExerciseWorksheet } from '@/ui/web/exerciserenderer/ExerciseWorksheet'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ScrollSheetPreviewProps {
  entries: Array<{ exercise: Exercise; groups: ExerciseBlockGroup[] }>
  mediaMap?: Record<string, MediaType>
  dir: 'ltr' | 'rtl'
}

/**
 * Miniature for the scroll view, which has no pages: the exercise currently
 * in view (per the scroll-exercise channel the chat already listens to),
 * laid out as a single worksheet page.
 */
export function ScrollSheetPreview({ entries, mediaMap, dir }: ScrollSheetPreviewProps) {
  const t = useTranslations('courses.chatTools')
  const [exerciseId, setExerciseId] = useState<string | null>(
    () => getPublishedScrollExercise()?.exerciseId ?? null,
  )

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ScrollExerciseEventDetail>).detail
      if (detail) setExerciseId(detail.exerciseId)
    }
    window.addEventListener(SCROLL_EXERCISE_EVENT, onChange)
    return () => window.removeEventListener(SCROLL_EXERCISE_EVENT, onChange)
  }, [])

  const index = Math.max(
    0,
    entries.findIndex((entry) => entry.exercise.id === exerciseId),
  )
  const entry = entries[index]
  if (!entry) return <SheetPreviewPanel label={null} content={{ kind: 'empty' }} />

  const label = t('sheetExercise')
    .replace('{current}', String(index + 1))
    .replace('{total}', String(entries.length))

  return (
    <SheetPreviewPanel
      label={label}
      content={{
        kind: 'page',
        node: (
          <div className="min-h-[60rem] px-9 py-section-md font-serif" dir={dir}>
            {entry.exercise.title && (
              <h2 className="mb-6 text-heading-lg font-bold text-foreground">
                {entry.exercise.title}
              </h2>
            )}
            <ExerciseWorksheet groups={entry.groups} mediaMap={mediaMap} hideLatexBlocks={false} />
          </div>
        ),
      }}
    />
  )
}
