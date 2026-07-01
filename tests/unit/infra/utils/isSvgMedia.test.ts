import { describe, expect, it } from 'vitest'
import { isSvgMedia, isSvgUrl } from '@/infra/utils/isSvgMedia'
import type { Media } from '@/infra/types/content'

function createMedia(overrides: Partial<Media> & { id: string }): Media {
  return {
    filename: 'diagram.svg',
    url: '/media/diagram.svg',
    alt: 'Circuit',
    mimeType: 'image/svg+xml',
    type: 'svg',
    filesize: 2048,
    ...overrides,
  } as Media
}

describe('isSvgMedia', () => {
  it('returns true when type is "svg"', () => {
    expect(isSvgMedia(createMedia({ id: '1' }))).toBe(true)
  })

  it('returns true when mediaType is "svg"', () => {
    expect(isSvgMedia(createMedia({ id: '1', type: 'something-else', mediaType: 'svg' }))).toBe(
      true,
    )
  })

  it('returns true for image/svg+xml mimeType (case-insensitive)', () => {
    expect(isSvgMedia(createMedia({ id: '1', type: 'image', mimeType: 'image/svg+xml' }))).toBe(
      true,
    )
    expect(isSvgMedia(createMedia({ id: '1', type: 'image', mimeType: 'IMAGE/SVG+XML' }))).toBe(
      true,
    )
  })

  it('returns true when the URL ends with .svg', () => {
    expect(isSvgMedia(createMedia({ id: '1', type: 'image', url: 'https://cdn/x/y.svg' }))).toBe(
      true,
    )
  })

  it('returns true when the URL ends with .svg followed by a query string', () => {
    expect(
      isSvgMedia(createMedia({ id: '1', type: 'image', url: '/media/diagram.svg?v=42&t=1' })),
    ).toBe(true)
  })

  it('does NOT trust filename alone when other signals say raster', () => {
    expect(
      isSvgMedia(
        createMedia({
          id: '1',
          type: 'image',
          url: '/media/photo.png',
          mimeType: 'image/png',
          filename: 'diagram.svg',
        }),
      ),
    ).toBe(false)
  })

  it('returns false for png / jpg / webp', () => {
    expect(
      isSvgMedia(
        createMedia({
          id: '1',
          type: 'image',
          mimeType: 'image/png',
          filename: 'a.png',
          url: '/a.png',
        }),
      ),
    ).toBe(false)
    expect(
      isSvgMedia(
        createMedia({
          id: '1',
          type: 'image',
          mimeType: 'image/jpeg',
          filename: 'a.jpg',
          url: '/a.jpg',
        }),
      ),
    ).toBe(false)
    expect(
      isSvgMedia(
        createMedia({
          id: '1',
          type: 'image',
          mimeType: 'image/webp',
          filename: 'a.webp',
          url: '/a.webp',
        }),
      ),
    ).toBe(false)
  })

  it('returns false for video / external types', () => {
    expect(
      isSvgMedia(
        createMedia({
          id: '1',
          type: 'video',
          mimeType: 'video/mp4',
          filename: 'a.mp4',
          url: '/a.mp4',
        }),
      ),
    ).toBe(false)
    expect(
      isSvgMedia({
        id: '1',
        type: 'external',
      }),
    ).toBe(false)
  })

  it('does not throw on null / missing fields', () => {
    expect(
      isSvgMedia({
        id: '1',
      }),
    ).toBe(false)
  })
})

describe('isSvgUrl', () => {
  it('matches .svg URLs', () => {
    expect(isSvgUrl('https://cdn.example.com/diagram.svg')).toBe(true)
    expect(isSvgUrl('/media/diagram.svg')).toBe(true)
  })

  it('matches .svg with query string', () => {
    expect(isSvgUrl('https://cdn.example.com/diagram.svg?v=42')).toBe(true)
  })

  it('is case-insensitive on the extension', () => {
    expect(isSvgUrl('https://cdn.example.com/diagram.SVG')).toBe(true)
  })

  it('rejects non-svg URLs', () => {
    expect(isSvgUrl('https://cdn.example.com/photo.png')).toBe(false)
    expect(isSvgUrl('https://cdn.example.com/asset.svgx')).toBe(false)
    expect(isSvgUrl('/media/sub/file.png')).toBe(false)
  })

  it('treats null / undefined as non-svg', () => {
    expect(isSvgUrl(undefined)).toBe(false)
    expect(isSvgUrl(null)).toBe(false)
    expect(isSvgUrl('')).toBe(false)
  })
})
