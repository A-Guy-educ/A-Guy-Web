// @vitest-environment jsdom
import { uploadDataUrlAsMedia } from '@/infra/media/uploadDataUrl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('uploadDataUrlAsMedia', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('POSTs a File to /api/media and returns the created doc id', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ doc: { id: 'media-123' } }), { status: 200 }),
    )
    const id = await uploadDataUrlAsMedia(PNG_DATA_URL, 'test.png')
    expect(id).toBe('media-123')
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]!
    expect(url).toBe('/api/media')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).credentials).toBe('include')
    const formData = (init as RequestInit).body as FormData
    const file = formData.get('file') as File
    expect(file.name).toBe('test.png')
    expect(file.type).toBe('image/png')
  })

  it('falls back to top-level `id` when response has no `doc` wrapper', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'media-flat' }), { status: 200 }),
    )
    const id = await uploadDataUrlAsMedia(PNG_DATA_URL, 'test.png')
    expect(id).toBe('media-flat')
  })

  it('throws when the data URL is malformed', async () => {
    await expect(uploadDataUrlAsMedia('not-a-data-url', 'x.png')).rejects.toThrow(
      /Malformed data URL/,
    )
  })

  it('throws with the HTTP status when upload is rejected', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response('boom', { status: 413 }))
    await expect(uploadDataUrlAsMedia(PNG_DATA_URL, 'x.png')).rejects.toThrow(/413/)
  })

  it('throws when the response has no id anywhere', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ doc: {} }), { status: 200 }),
    )
    await expect(uploadDataUrlAsMedia(PNG_DATA_URL, 'x.png')).rejects.toThrow(/no id/)
  })

  it('propagates network errors', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('offline'))
    await expect(uploadDataUrlAsMedia(PNG_DATA_URL, 'x.png')).rejects.toThrow(/offline/)
  })
})
