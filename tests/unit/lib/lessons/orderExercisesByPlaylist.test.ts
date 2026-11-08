import { describe, expect, it } from 'vitest'

import type { ContentPage, Exercise } from '@/infra/types/content'
import { orderExercisesByPlaylist } from '@/lib/lessons/orderExercisesByPlaylist'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'

const exercise = (id: string, order?: number) => ({ id, order }) as Exercise
const exerciseBlock = (data: Exercise): ResolvedLessonBlock => ({ type: 'exercise', data })
const contentPageBlock = (id: string): ResolvedLessonBlock => ({
  type: 'contentPage',
  data: { id } as ContentPage,
})
const ids = (exercises: Exercise[]) => exercises.map((item) => item.id)

describe('orderExercisesByPlaylist', () => {
  const a = exercise('a', 0)
  const b = exercise('b', 1)
  const c = exercise('c', 2)

  it('lets playlist order win over exercise.order', () => {
    const blocks = [c, a, b].map(exerciseBlock)
    expect(ids(orderExercisesByPlaylist([a, b, c], blocks))).toEqual(['c', 'a', 'b'])
  })

  it('puts exercises missing from the playlist last, keeping their exercise.order sort', () => {
    const d = exercise('d', 3)
    const blocks = [d, a].map(exerciseBlock)
    expect(ids(orderExercisesByPlaylist([a, b, c, d], blocks))).toEqual(['d', 'a', 'b', 'c'])
  })

  it('falls back to exercise.order when the playlist is empty', () => {
    expect(ids(orderExercisesByPlaylist([a, b, c], []))).toEqual(['a', 'b', 'c'])
  })

  it('falls back to exercise.order when the playlist has only content pages', () => {
    expect(ids(orderExercisesByPlaylist([a, b, c], [contentPageBlock('page')]))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('ignores content pages when positioning exercises', () => {
    const blocks = [
      contentPageBlock('page-1'),
      exerciseBlock(b),
      contentPageBlock('page-2'),
      exerciseBlock(a),
    ]
    expect(ids(orderExercisesByPlaylist([a, b], blocks))).toEqual(['b', 'a'])
  })

  it('does not add playlist exercises that are not in the list', () => {
    const blocks = [exerciseBlock(exercise('other-lesson', 0)), exerciseBlock(a)]
    expect(ids(orderExercisesByPlaylist([a, b], blocks))).toEqual(['a', 'b'])
  })

  it('does not mutate the list it was given', () => {
    const input = [a, b, c]
    orderExercisesByPlaylist(input, [c, b, a].map(exerciseBlock))
    expect(ids(input)).toEqual(['a', 'b', 'c'])
  })
})
