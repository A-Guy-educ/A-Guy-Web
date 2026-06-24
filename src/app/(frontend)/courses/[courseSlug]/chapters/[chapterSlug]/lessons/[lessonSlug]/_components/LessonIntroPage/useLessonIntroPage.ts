'use client'

import { useState } from 'react'

type LessonIntroPageState =
  | { type: 'intro' }
  | { type: 'preamble'; initialExerciseIndex: number }
  | { type: 'content'; initialExerciseIndex: number }
  | { type: 'workspace' }

interface UseLessonIntroPageOptions {
  /**
   * Exercise ID (slug or numeric ID) from ?exerciseId= search param.
   * When provided, the intro is skipped and workspace is shown directly (deep-link).
   */
  deepLinkedExerciseId?: string | null
  /**
   * When true and no deep link is active, handleStart routes to the preamble
   * instead of going directly to content.
   */
  hasContentPagesPreamble?: boolean
}

export function useLessonIntroPage({
  deepLinkedExerciseId,
  hasContentPagesPreamble = false,
}: UseLessonIntroPageOptions) {
  const [pageState, setPageState] = useState<LessonIntroPageState>(
    deepLinkedExerciseId ? { type: 'workspace' } : { type: 'intro' },
  )

  const handleFinishPreamble = (initialExerciseIndex = 0) => {
    setPageState({ type: 'content', initialExerciseIndex })
  }

  const handleStart = (initialExerciseIndex = 0) => {
    if (hasContentPagesPreamble && !deepLinkedExerciseId) {
      setPageState({ type: 'preamble', initialExerciseIndex })
    } else {
      setPageState({ type: 'content', initialExerciseIndex })
    }
  }

  return {
    pageState,
    handleStart,
    handleFinishPreamble,
  }
}
