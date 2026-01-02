import { z } from 'zod'
import { BlockIdSchema } from '../primitives'

/**
 * Exercise Content Schema - Hierarchical Blocks (v2)
 *
 * Represents the complete content of an exercise.
 * - contentSchemaVersion: 2 (supports containers + nesting)
 * - stem: Array of Block (ContainerBlock or RichTextBlock)
 *
 * Supports up to 3 levels of nesting:
 * - Level 0: Root (stem array)
 * - Level 1: ContainerBlock (can contain ContainerBlock or RichTextBlock)
 * - Level 2: ContainerBlock or RichTextBlock (leaf level)
 */

/** Rich text block - leaf node */
const RichTextBlockSchema = z
  .object({
    id: BlockIdSchema,
    type: z.literal('rich_text'),
    format: z.literal('md-math-v1'),
    value: z.string().min(1),
  })
  .strict()

export type RichTextBlock = z.infer<typeof RichTextBlockSchema>

/** Container block interface - for recursive reference */
export interface ContainerBlock {
  id: string
  type: 'container'
  title?: string
  children: Block[]
}

/** Union type of all blocks */
export type Block = RichTextBlock | ContainerBlock

/** Container block schema - can contain other blocks */
const ContainerBlockSchema: z.ZodType<ContainerBlock> = z
  .object({
    id: BlockIdSchema,
    type: z.literal('container'),
    title: z.string().optional(),
    children: z.lazy(() => z.array(BlockSchema)),
  })
  .strict()

/** Discriminated union of all block types */
export const BlockSchema: z.ZodType<Block> = z.union([RichTextBlockSchema, ContainerBlockSchema])

export const ExerciseContentSchema = z
  .object({
    contentSchemaVersion: z.union([z.literal(1), z.literal(2)]).default(2),
    stem: z.array(BlockSchema),
  })
  .strict()

export type ExerciseContent = z.infer<typeof ExerciseContentSchema>

/**
 * Migrate v1 content to v2 structure
 * Converts flat RichTextBlock[] to hierarchical structure
 */
export function migrateV1ToV2(content: any): ExerciseContent {
  // If already v2, return as-is
  if (content?.contentSchemaVersion === 2) {
    return content as ExerciseContent
  }

  // If v1, wrap all blocks in a default container
  const stem = content?.stem || []

  // If empty, return default v2 structure
  if (stem.length === 0) {
    return {
      contentSchemaVersion: 2,
      stem: [],
    }
  }

  // If only one block, keep it flat (no container needed)
  if (stem.length === 1) {
    return {
      contentSchemaVersion: 2,
      stem: stem,
    }
  }

  // Multiple blocks: wrap in a default container
  return {
    contentSchemaVersion: 2,
    stem: [
      {
        id: 'migrated-container-1',
        type: 'container',
        title: 'Content',
        children: stem,
      },
    ],
  }
}
