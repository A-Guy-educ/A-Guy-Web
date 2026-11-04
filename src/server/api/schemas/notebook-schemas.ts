/**
 * @fileType schema
 * @domain notebook
 * @ai-summary Zod schemas for the notebook page routes. The caps bound how much one save can write: a page is at most a few MB of stroke points even when a student fills it edge to edge.
 */
import { z } from 'zod'

import {
  NOTEBOOK_INK_COUNT,
  NOTEBOOK_MAX_PAGE_HEIGHT,
  NOTEBOOK_MIN_PAGE_HEIGHT,
} from '@/infra/types/notebook'

const MAX_STROKES_PER_PAGE = 3_000
const MAX_POINTS_PER_STROKE = 8_000
const MAX_ID_LENGTH = 64

const pageHeight = z.number().int().min(NOTEBOOK_MIN_PAGE_HEIGHT).max(NOTEBOOK_MAX_PAGE_HEIGHT)
const unit = z.number().min(0).max(1)

const strokeSchema = z.object({
  ink: z
    .number()
    .int()
    .min(0)
    .max(NOTEBOOK_INK_COUNT - 1),
  erase: z.boolean().optional(),
  width: z.number().min(0.5).max(200).optional(),
  points: z.array(z.number().finite()).min(2).max(MAX_POINTS_PER_STROKE),
})

const cutSchema = z.object({
  mediaId: z.string().min(1).max(MAX_ID_LENGTH),
  // Rendered as an <img src>; only the blob store's https URLs are expected.
  url: z
    .string()
    .url()
    .max(2_000)
    .refine((value) => value.startsWith('https://'), { message: 'Cut URL must be https' }),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(40_000),
  source: z.object({
    kind: z.enum(['pdf', 'scroll']),
    mediaId: z.string().min(1).max(MAX_ID_LENGTH).optional(),
    label: z.string().max(300),
    page: z.number().int().positive().optional(),
    rect: z.object({ x: unit, y: unit, w: unit, h: unit }).optional(),
  }),
})

export const notebookListQuerySchema = z.object({
  lessonId: z.string().min(1).max(MAX_ID_LENGTH),
})

export const notebookPageCreateSchema = z.object({
  lessonId: z.string().min(1).max(MAX_ID_LENGTH),
  height: pageHeight,
  cut: cutSchema.nullish(),
})

export const notebookPageUpdateSchema = z
  .object({
    height: pageHeight.optional(),
    strokes: z.array(strokeSchema).max(MAX_STROKES_PER_PAGE).optional(),
  })
  .refine((value) => value.height !== undefined || value.strokes !== undefined, {
    message: 'Nothing to update',
  })
