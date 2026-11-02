/**
 * @fileType utility
 * @domain lessons
 * @pattern lesson-content-blocks
 * @ai-summary Reads a lesson's own content blocks (`lesson.content`, authored in the Admin
 *             "Blocks" tab). Same `{ blocks: ContentBlock[] }` shape as exercise/section
 *             content. Not to be confused with `lesson.blocks`, which is the exercise playlist.
 */

import type { Lesson } from '@/infra/types/content'
import type { ContentBlock } from '@/infra/types/exercise'

function readBlocks(content: unknown): ContentBlock[] {
  if (Array.isArray(content)) return content as ContentBlock[]
  if (content && typeof content === 'object' && 'blocks' in content) {
    const blocks = (content as { blocks?: unknown }).blocks
    if (Array.isArray(blocks)) return blocks as ContentBlock[]
  }
  return []
}

/**
 * Admin seeds every new lesson with one empty `rich_text` block, so a blank
 * rich-text block means "nothing authored" and must not render an empty card.
 */
function isBlankRichText(block: ContentBlock): boolean {
  if (block.type !== 'rich_text') return false
  const value = (block as { value?: unknown }).value
  return typeof value !== 'string' || value.trim().length === 0
}

/**
 * Return the lesson's content blocks, or `[]` when the lesson has none.
 * Tolerates the bare `ContentBlock[]` shape as well as the `{ blocks }` wrapper.
 * Lessons created before the field existed have no `content` at all.
 */
export function getLessonContentBlocks(lesson: Pick<Lesson, 'content'>): ContentBlock[] {
  return (
    readBlocks(lesson.content)
      .filter((block) => Boolean(block) && typeof block === 'object' && !isBlankRichText(block))
      // Renderers key React nodes and stored answers by block id; Admin's
      // seeded default block has none, so backfill a stable positional id.
      .map((block, index) => (block.id ? block : { ...block, id: `lesson-block-${index}` }))
  )
}
