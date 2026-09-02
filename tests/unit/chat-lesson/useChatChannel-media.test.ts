// @vitest-environment jsdom
import { useChatChannel } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/useChatChannel'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function makeSseResponse(text: string) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`))
      controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('useChatChannel — mediaIds forwarding', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeSseResponse('hi'))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const baseArgs = {
    lessonId: 'lesson-1',
    currentExerciseId: 'ex-1',
    currentExerciseContext: null,
    append: vi.fn(),
    replace: vi.fn(),
    acknowledgment: 'ack',
    errorMessage: 'err',
    authRequiredMessage: 'auth',
    quotaExceededMessage: 'quota',
  }

  it('requestWithMedia forwards mediaIds in the request body', async () => {
    const { result } = renderHook(() => useChatChannel(baseArgs))
    await act(async () => {
      result.current.requestWithMedia('check this drawing', ['media-abc'])
      // Let the SSE stream drain
      await new Promise((r) => setTimeout(r, 20))
    })

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string) as {
      mediaIds?: string[]
      exerciseId?: string
      lessonId: string
    }
    expect(body.mediaIds).toEqual(['media-abc'])
    expect(body.lessonId).toBe('lesson-1')
    expect(body.exerciseId).toBe('ex-1')
  })

  it('plain send omits mediaIds from the body', async () => {
    const { result } = renderHook(() => useChatChannel(baseArgs))
    await act(async () => {
      result.current.send('hello')
      await new Promise((r) => setTimeout(r, 20))
    })

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string) as {
      mediaIds?: string[]
    }
    expect(body.mediaIds).toBeUndefined()
  })

  it('requestWithMedia does not push a user bubble into the stream', async () => {
    const append = vi.fn()
    const { result } = renderHook(() => useChatChannel({ ...baseArgs, append }))
    await act(async () => {
      result.current.requestWithMedia('check this drawing', ['media-abc'])
      await new Promise((r) => setTimeout(r, 20))
    })

    // Any user-role bubble means we leaked the invisible prompt as an utterance.
    const userEntries = append.mock.calls
      .map((c) => c[0] as { kind: string })
      .filter((entry) => entry.kind === 'chat-user')
    expect(userEntries).toHaveLength(0)
  })

  it('requestWithMedia is a no-op on empty prompt', async () => {
    const { result } = renderHook(() => useChatChannel(baseArgs))
    await act(async () => {
      result.current.requestWithMedia('   ', ['media-abc'])
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
