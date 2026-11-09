/**
 * @fileType schema
 * @domain notebook
 * @ai-summary Zod schemas for the notebook page routes. The caps bound how much one save can write: a page is at most a few MB of stroke points even when a student fills it edge to edge.
 */
import { z } from 'zod'

import {
  NOTEBOOK_INK_COUNT,
  NOTEBOOK_MAX_PAGE_HEIGHT,
  NOTEBOOK_MAX_STROKES,
  NOTEBOOK_MIN_PAGE_HEIGHT,
  type NotebookScope,
} from '@/infra/types/notebook'

const MAX_POINTS_PER_STROKE = 8_000
const MAX_ID_LENGTH = 64
/** Ask contextKeys are `ask:<courseId>:<timestamp>`; leave room for that to grow. */
const MAX_CONTEXT_KEY_LENGTH = 200

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

/**
 * A notebook is addressed by exactly one of `lessonId` (a lesson) or
 * `askContext` (an Ask room's conversation contextKey).
 */
const scopeFields = {
  lessonId: z.string().min(1).max(MAX_ID_LENGTH).optional(),
  askContext: z.string().min(1).max(MAX_CONTEXT_KEY_LENGTH).optional(),
}

function hasOneScope(value: { lessonId?: string; askContext?: string }): boolean {
  return (value.lessonId === undefined) !== (value.askContext === undefined)
}

function toScope(value: { lessonId?: string; askContext?: string }): NotebookScope {
  return value.lessonId !== undefined
    ? { kind: 'lesson', lessonId: value.lessonId }
    : { kind: 'ask', contextKey: value.askContext! }
}

const ONE_SCOPE = { message: 'Give exactly one of lessonId or askContext' }

export const notebookListQuerySchema = z
  .object(scopeFields)
  .refine(hasOneScope, ONE_SCOPE)
  .transform((value) => ({ scope: toScope(value) }))

export const notebookPageCreateSchema = z
  .object({ ...scopeFields, height: pageHeight, cut: cutSchema.nullish() })
  .refine(hasOneScope, ONE_SCOPE)
  .transform(({ lessonId, askContext, ...rest }) => ({
    ...rest,
    scope: toScope({ lessonId, askContext }),
  }))

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'
/** Keeps a check under Vercel's 4.5 MB request body limit. */
const MAX_INK_DATA_URL_LENGTH = 4_000_000

export const notebookCheckSchema = z
  .object({
    inkImage: z
      .string()
      .max(MAX_INK_DATA_URL_LENGTH)
      .refine((value) => value.startsWith(`${PNG_DATA_URL_PREFIX}iVBOR`), {
        message: 'Handwriting must be a PNG data URL',
      }),
    exerciseMediaId: z.string().min(1).max(MAX_ID_LENGTH).optional(),
    contextKey: z.string().min(1).max(MAX_CONTEXT_KEY_LENGTH),
    lessonId: z.string().min(1).max(MAX_ID_LENGTH).optional(),
    locale: z.enum(['he', 'en']),
  })
  .transform(({ inkImage, ...rest }) => ({
    ...rest,
    inkBase64: inkImage.slice(PNG_DATA_URL_PREFIX.length),
  }))

export const notebookPageUpdateSchema = z
  .object({
    height: pageHeight.optional(),
    strokes: z.array(strokeSchema).max(NOTEBOOK_MAX_STROKES).optional(),
  })
  .refine((value) => value.height !== undefined || value.strokes !== undefined, {
    message: 'Nothing to update',
  })
