'use client'

import type { ContentBlock } from '@/infra/types/exercise'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { useTranslations } from '@/ui/web/providers/I18n'

/** The lesson's first sketch, rendered read-only through the shared exercise renderer. */
export function LessonLandingVisual({ block }: { block: ContentBlock }) {
  const t = useTranslations('courses')
  // The landing only shows the picture; drop any question the axis block carries.
  const sketch = block.type === 'question_axis' ? { ...block, answer: undefined } : block

  return (
    <figure className="rounded-xl border border-border bg-background p-card-padding-sm shadow-elevation-1">
      <ExerciseRenderer
        groups={[{ blocks: [sketch], sectionIndex: null }]}
        showCheckAnswer={false}
      />
      <figcaption className="mt-2 text-body-xs text-muted-foreground">
        {t('lessonLandingVisualCaption')}
      </figcaption>
    </figure>
  )
}
