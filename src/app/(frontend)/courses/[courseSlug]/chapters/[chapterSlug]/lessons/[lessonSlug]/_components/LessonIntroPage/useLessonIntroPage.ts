'use client'

import { useState } from 'react'

type LessonIntroPageState = 'intro' | 'exercises' | 'pdf' | 'workspace'

interface UseLessonIntroPageOptions {
  /**
   * Exercise ID (slug or numeric ID) from ?exerciseId= search param.
   * When provided, the intro is skipped and workspace is shown directly (deep-link).
   */
  deepLinkedExerciseId?: string | null
}

export function useLessonIntroPage({ deepLinkedExerciseId }: UseLessonIntroPageOptions) {
  const [pageState, setPageState] = useState<LessonIntroPageState>(
    deepLinkedExerciseId ? 'workspace' : 'intro',
  )

  const handleStart = (contentType: 'exercises' | 'pdf' | 'scroll' = 'scroll') => {
    if (contentType === 'exercises') {
      setPageState('exercises')
    } else if (contentType === 'pdf') {
      setPageState('pdf')
    } else {
      setPageState('workspace')
    }
  }

  return {
    pageState,
    handleStart,
  }
}
