'use client'

/**
 * A real exercise in the landing's "try it here" slot: the lesson player with
 * its feedback and hint → guiding question → explanation buttons, plus the
 * lesson intro card's touch of showing the written hint after a wrong pick.
 * Nothing is reported to the server (no lesson / exercise ids) — visitors
 * aren't signed in.
 *
 * @fileType component
 * @domain frontend
 */
import { useState } from 'react'

import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { ExerciseRenderer } from '@/ui/web/exerciserenderer'
import { useTranslations } from '@/ui/web/providers/I18n'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

function questionHint(groups: ExerciseBlockGroup[]): string | null {
  for (const group of groups) {
    for (const block of group.blocks as unknown as Array<{ type?: string; hint?: unknown }>) {
      if (!block.type?.startsWith('question')) continue
      const hint = block.hint as { value?: unknown } | string | undefined
      const text = typeof hint === 'string' ? hint : hint?.value
      return typeof text === 'string' && text.trim() ? text : null
    }
  }
  return null
}

export function LandingDemoExercise({ groups }: { groups: ExerciseBlockGroup[] }) {
  const t = useTranslations('courses')
  const [wrong, setWrong] = useState(false)
  const hint = questionHint(groups)

  return (
    <div className="system-example-live">
      <ExerciseRenderer
        groups={groups}
        mode="student"
        showCheckAnswer
        inlineHelp
        onResultsChange={({ checkedCount, correctCount }) =>
          setWrong(checkedCount > 0 && correctCount < checkedCount)
        }
      />
      {wrong && hint ? (
        <div className="demo-wrong-hint" role="status">
          <MathMarkdown content={`${t('lessonLandingHint')} ${hint}`} />
        </div>
      ) : null}
    </div>
  )
}
