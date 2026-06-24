'use client'

import { useState } from 'react'

type LessonIntroPageState =
  | { type: 'intro' }
  | { type: 'preamble' }
  | { type: 'content'; initialExerciseIndex: number }
  | { type: 'workspace' }

interface UseLessonIntroPageOptions {
  /**
   * Exercise ID (slug or numeric ID) from ?exerciseId= search param.
   * When provided, the intro is skipped and workspace is shown directly (deep-link).
   */
  deepLinkedExerciseId?: string | null
  /**
   * When true and the user is not deep-linked, clicking Start shows the content-pages
   * preamble before routing to the interactive viewer.
   */
  hasContentPagesPreamble?: boolean
}

export function useLessonIntroPage({
  deepLinkedExerciseId,
  hasContentPagesPreamble,
}: UseLessonIntroPageOptions) {
  const [pageState, setPageState] = useState<LessonIntroPageState>(
    deepLinkedExerciseId ? { type: 'workspace' } : { type: 'intro' },
  )

  const handleStart = (initialExerciseIndex = 0) => {
    if (hasContentPagesPreamble && !deepLinkedExerciseId) {
      setPageState({ type: 'preamble' })
    } else {
      setPageState({ type: 'content', initialExerciseIndex })
    }
  }

  const handleFinishPreamble = (initialExerciseIndex = 0) => {
    setPageState({ type: 'content', initialExerciseIndex })
  }

  return {
    pageState,
    handleStart,
    handleFinishPreamble,
  }
}
