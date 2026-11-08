import type { Exercise } from '@/infra/types/content'
import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'

/**
 * Reorders a lesson's exercises to match its `blocks` playlist, which is what
 * Admin saves when exercises are reordered. Exercises missing from the
 * playlist go last, keeping their incoming order. The set of exercises never
 * changes: a playlist entry that isn't in `exercises` is ignored.
 */
export function orderExercisesByPlaylist(
  exercises: Exercise[],
  blocks: ResolvedLessonBlock[],
): Exercise[] {
  const playlistIds = blocks.flatMap((block) => (block.type === 'exercise' ? [block.data.id] : []))
  const position = ({ id }: Exercise) => {
    const index = playlistIds.indexOf(id)
    return index === -1 ? playlistIds.length : index
  }
  return [...exercises].sort((a, b) => position(a) - position(b))
}
