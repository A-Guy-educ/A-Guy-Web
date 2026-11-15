'use client'

import type { ContentBlock } from '@/infra/types/exercise'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { SketchMaxHeightProvider } from '@/ui/web/exerciserenderer/context/SketchMaxHeightContext'

// Three cards share a row, so sketches are capped well under the 330px spec.
const PREVIEW_SKETCH_MAX_HEIGHT_PX = 180

/** The exercise statement / sketch a practice question refers to, shown read-only. */
export function LessonLandingPracticeContext({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-background px-3 py-2 text-body-sm">
      <SketchMaxHeightProvider value={PREVIEW_SKETCH_MAX_HEIGHT_PX}>
        <ExerciseRenderer groups={[{ blocks, sectionIndex: null }]} showCheckAnswer={false} />
      </SketchMaxHeightProvider>
    </div>
  )
}
