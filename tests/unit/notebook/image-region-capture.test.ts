import { describe, expect, it } from 'vitest'

import { notebookPageCreateSchema } from '@/server/api/schemas'
import { imageCropFor } from '@/ui/web/notebook/RegionCut/image-region-capture'

const displayed = { left: 100, top: 50, width: 400, height: 300 }
const natural = { width: 1600, height: 1200 }

describe('imageCropFor', () => {
  it('maps a selection on the displayed image to file pixels', () => {
    expect(
      imageCropFor({ left: 200, top: 100, width: 100, height: 50 }, displayed, natural),
    ).toEqual({
      sourceX: 400,
      sourceY: 200,
      sourceWidth: 400,
      sourceHeight: 200,
      outputWidth: 400,
      outputHeight: 200,
    })
  })

  it('keeps only the part of the selection on the image', () => {
    const crop = imageCropFor({ left: 50, top: 50, width: 100, height: 100 }, displayed, natural)

    expect(crop).toMatchObject({ sourceX: 0, sourceY: 0, sourceWidth: 200, sourceHeight: 400 })
  })

  it('returns null for a selection that misses the image', () => {
    expect(imageCropFor({ left: 0, top: 0, width: 50, height: 40 }, displayed, natural)).toBeNull()
  })

  it('caps the output size of a very large image without changing its shape', () => {
    const crop = imageCropFor({ left: 100, top: 50, width: 400, height: 300 }, displayed, {
      width: 8000,
      height: 6000,
    })

    expect(crop).toMatchObject({ sourceWidth: 8000, outputWidth: 2400, outputHeight: 1800 })
  })
})

describe('notebookPageCreateSchema', () => {
  it('accepts a cut taken from an uploaded image', () => {
    const parsed = notebookPageCreateSchema.safeParse({
      askContext: 'ask:course-1:1730800000000',
      height: 1150,
      cut: {
        mediaId: 'media-1',
        url: 'https://blob.example.com/cut.jpg',
        width: 800,
        height: 240,
        source: { kind: 'image', mediaId: 'upload-1', label: 'homework' },
      },
    })

    expect(parsed.success).toBe(true)
  })
})
