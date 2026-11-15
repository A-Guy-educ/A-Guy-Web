import type { Exercise } from '@/infra/types/content'
import type { ContentBlock } from '@/infra/types/exercise'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'

// Blocks that set up the exercise (statement text, sketches) rather than ask
// something. Sections refer back to these ("in the sketch…"), so a section
// question shown on its own needs them.
const STATIC_TYPES = new Set(['rich_text', 'latex'])
const SKETCH_QUESTION_TYPES = new Set(['question_geometry', 'question_axis', 'question_multi_axis'])

/**
 * Turn an exercise-level block into a read-only version for the landing
 * preview, or `null` when it is a question the preview can't answer.
 */
function toContextBlock(block: ContentBlock): ContentBlock | null {
  if (!block || typeof block !== 'object') return null
  if (STATIC_TYPES.has(block.type)) return block
  if (block.type === 'svg') return block.value?.trim() && !block.interactive ? block : null
  if (block.type === 'html') return block.html && !block.guidedExplanation ? block : null
  if (!SKETCH_QUESTION_TYPES.has(block.type)) return null

  // Keep the sketch and its given data, drop the answer key so no check UI
  // shows. Stack text over the sketch: a preview card is too narrow for
  // side-by-side.
  const { answer: _answer, hint: _hint, solution: _solution, fullSolution: _full, ...rest } = block
  const stacked = { ...rest, layout: 'textAbove' }
  return block.type === 'question_geometry'
    ? { ...stacked, geometry: { ...block.geometry, interactive: false } }
    : stacked
}

/**
 * The exercise's own blocks (the ones shared by every section), made safe to
 * render next to a single section's question on the lesson landing page.
 * Legacy exercises keep their questions in the own blocks too; there only the
 * blocks before `questionId` count as its setup.
 */
export function getLandingContextBlocks(exercise: Exercise, questionId: string): ContentBlock[] {
  const own = getExerciseBlockGroups(exercise).find((group) => group.sectionIndex === null)
  const blocks = own?.blocks ?? []
  const questionIndex = blocks.findIndex((block) => block?.id === questionId)
  return (questionIndex === -1 ? blocks : blocks.slice(0, questionIndex))
    .map(toContextBlock)
    .filter((block): block is ContentBlock => block !== null)
}
