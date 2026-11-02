import { describe, expect, it } from 'vitest'

import { getLessonContentBlocks } from '@/lib/lessons/getLessonContentBlocks'
import type { ContentBlock } from '@/infra/types/exercise'

const richText = (id: string, value: string): ContentBlock => ({ id, type: 'rich_text', value })

describe('getLessonContentBlocks', () => {
  it('returns [] when the lesson has no content (pre-existing lessons)', () => {
    expect(getLessonContentBlocks({})).toEqual([])
    expect(getLessonContentBlocks({ content: null })).toEqual([])
  })

  it('reads the { blocks } wrapper', () => {
    const blocks = [richText('a', 'hello'), richText('b', 'world')]
    expect(getLessonContentBlocks({ content: { blocks } })).toEqual(blocks)
  })

  it('reads a bare block array', () => {
    const blocks = [richText('a', 'hello')]
    expect(getLessonContentBlocks({ content: blocks })).toEqual(blocks)
  })

  it('drops the empty rich_text block Admin seeds on new lessons', () => {
    const seeded = {
      blocks: [{ type: 'rich_text', format: 'md-math-v1', value: '', mediaIds: [] }],
    }
    expect(getLessonContentBlocks({ content: seeded })).toEqual([])
  })

  it('keeps non-text blocks and non-blank rich text', () => {
    const svg = { id: 's', type: 'svg', svg: '<svg/>' } as unknown as ContentBlock
    const blocks = [richText('blank', '   '), svg, richText('t', 'text')]
    expect(getLessonContentBlocks({ content: { blocks } })).toEqual([svg, blocks[2]])
  })

  it('backfills an id on blocks that have none', () => {
    const blocks = [{ type: 'rich_text', value: 'no id' }, richText('keep', 'has id')]
    expect(getLessonContentBlocks({ content: { blocks } }).map((b) => b.id)).toEqual([
      'lesson-block-0',
      'keep',
    ])
  })

  it('returns [] for unrecognised shapes', () => {
    expect(getLessonContentBlocks({ content: 'nope' })).toEqual([])
    expect(getLessonContentBlocks({ content: { blocks: 'nope' } })).toEqual([])
  })
})
