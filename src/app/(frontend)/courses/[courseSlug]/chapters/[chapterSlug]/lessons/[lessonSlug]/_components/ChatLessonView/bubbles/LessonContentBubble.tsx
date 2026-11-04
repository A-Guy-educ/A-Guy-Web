'use client'

import { lessonContentStorageId } from '@/infra/learning-state/refs'
import type { Media } from '@/infra/types/content'
import type { ContentBlock, ExerciseBlockGroup } from '@/infra/types/exercise'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { useMemo } from 'react'

// Re-exported so the runner's reset can wipe it alongside the exercises' state.
export { lessonContentStorageId }

interface LessonContentBubbleProps {
  lessonId: string
  blocks: ContentBlock[]
  mediaMap?: Record<string, Media>
}

/**
 * The lesson's own content blocks (`lesson.content`), shown as a card at the
 * very top of the chat stream — above the teacher's welcome message.
 */
export function LessonContentBubble({ lessonId, blocks, mediaMap }: LessonContentBubbleProps) {
  const groups = useMemo<ExerciseBlockGroup[]>(() => [{ blocks, sectionIndex: null }], [blocks])

  return (
    <div className="rounded-2xl border border-border bg-card p-card-padding-sm shadow-elevation-1 md:p-5">
      <ExerciseRenderer
        groups={groups}
        mediaMap={mediaMap}
        showExerciseNumber={false}
        lessonId={lessonId}
        exerciseId={lessonContentStorageId(lessonId)}
        hideLatexBlocks={false}
        questionCardVariant="flat"
        hideHelpSystem
      />
    </div>
  )
}
