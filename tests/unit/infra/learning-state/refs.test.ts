import { describe, expect, it } from 'vitest'

import {
  learningStateId,
  lessonContentStorageId,
  lessonLearningStateRefs,
} from '@/infra/learning-state/refs'

describe('lessonLearningStateRefs', () => {
  it('covers every key a lesson writes, so all of it is restored on another computer', () => {
    expect(lessonLearningStateRefs('lesson-1', ['ex-1', 'ex-2']).map(learningStateId)).toEqual([
      'lesson-chat:lesson-1',
      'exercise:lesson-content-lesson-1',
      'exercise:ex-1',
      'exercise:review-ex-1',
      'exercise:ex-2',
      'exercise:review-ex-2',
    ])
  })

  it('namespaces lesson-content answers away from exercise ids', () => {
    expect(lessonContentStorageId('lesson-1')).toBe('lesson-content-lesson-1')
  })
})
