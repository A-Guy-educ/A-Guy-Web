// @vitest-environment jsdom
import { useChatChannel } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/useChatChannel'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function makeQuota429(
  code: 'quota_exceeded' | 'token_limit_exceeded' = 'quota_exceeded',
): Response {
  return new Response(JSON.stringify({ error: code, message: `${code} msg` }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Build a 200 SSE response whose stream emits a single `error` frame carrying
 * a ChatErrorBody. Mirrors how the stream route surfaces token/quota caps
 * that are checked INSIDE the stream (post-handshake), which is where
 * `token_limit_exceeded` actually lands.
 */
function makeSseErrorResponse(code: string, message = 'bad') {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: error\ndata: ${JSON.stringify({ success: false, error: code, message })}\n\n`,
        ),
      )
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

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

describe('useChatChannel — Task 7 quota-exhausted flow', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const baseArgs = () => ({
    lessonId: 'lesson-1',
    currentExerciseId: 'ex-1',
    currentExerciseContext: null,
    append: vi.fn(),
    replace: vi.fn(),
    acknowledgment: 'ack',
    errorMessage: 'err',
    authRequiredMessage: 'auth',
    quotaExceededMessage: 'quota',
  })

  it('on 429 with quotaExceeded, promotes pending bubble to a quota-exhausted entry', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeQuota429())
    const args = baseArgs()
    const { result } = renderHook(() => useChatChannel(args))

    await act(async () => {
      result.current.requestCorrection('explain this miss')
      await new Promise((r) => setTimeout(r, 20))
    })

    // The replace call that swaps the pending bubble should produce a
    // quota-exhausted entry — not a plain error.
    const replacedKinds = args.replace.mock.calls.map((call) => (call[1] as { kind: string }).kind)
    expect(replacedKinds).toContain('quota-exhausted')
    expect(replacedKinds).not.toContain('chat-error')
    expect(result.current.isQuotaExhausted).toBe(true)
  })

  it('subsequent requestCorrection calls are silent no-ops (no fetch, no new entries)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeQuota429())
    const args = baseArgs()
    const { result } = renderHook(() => useChatChannel(args))

    await act(async () => {
      result.current.requestCorrection('first')
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(result.current.isQuotaExhausted).toBe(true)

    args.append.mockClear()
    args.replace.mockClear()
    vi.mocked(globalThis.fetch).mockClear()

    await act(async () => {
      result.current.requestCorrection('second attempt after quota ran out')
      result.current.send('and a freeform question')
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(args.append).not.toHaveBeenCalled()
    expect(args.replace).not.toHaveBeenCalled()
  })

  it('a plain 429 (rate_limited, no quota code) still falls through to a chat-error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'rate_limited', message: 'try later' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const args = baseArgs()
    const { result } = renderHook(() => useChatChannel(args))

    await act(async () => {
      result.current.requestCorrection('go')
      await new Promise((r) => setTimeout(r, 20))
    })

    const replacedKinds = args.replace.mock.calls.map((call) => (call[1] as { kind: string }).kind)
    expect(replacedKinds).toContain('chat-error')
    expect(replacedKinds).not.toContain('quota-exhausted')
    expect(result.current.isQuotaExhausted).toBe(false)
  })

  it('pre-stream 429 with token_limit_exceeded promotes to the quota-exhausted card', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeQuota429('token_limit_exceeded'))
    const args = baseArgs()
    const { result } = renderHook(() => useChatChannel(args))

    await act(async () => {
      result.current.requestCorrection('go')
      await new Promise((r) => setTimeout(r, 20))
    })

    const replacedKinds = args.replace.mock.calls.map((call) => (call[1] as { kind: string }).kind)
    expect(replacedKinds).toContain('quota-exhausted')
    expect(result.current.isQuotaExhausted).toBe(true)
  })

  it('mid-stream SSE error with token_limit_exceeded promotes to the quota card too', async () => {
    // This is the real-world path for the tier LLM token cap: the stream
    // handshake succeeds, then `enforceTutorTurnPolicy` throws inside the
    // SSE body and the server emits an `event: error` frame. Before the
    // fix the client would surface the raw code string as an error bubble.
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeSseErrorResponse('token_limit_exceeded'))
    const args = baseArgs()
    const { result } = renderHook(() => useChatChannel(args))

    await act(async () => {
      result.current.requestCorrection('go')
      await new Promise((r) => setTimeout(r, 20))
    })

    const replacedKinds = args.replace.mock.calls.map((call) => (call[1] as { kind: string }).kind)
    expect(replacedKinds).toContain('quota-exhausted')
    expect(replacedKinds).not.toContain('chat-error')
    expect(result.current.isQuotaExhausted).toBe(true)
  })

  it('mid-stream SSE error with a non-quota code surfaces the server message, not the code', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      makeSseErrorResponse('provider_error', 'the tutor is temporarily unavailable'),
    )
    const args = baseArgs()
    const { result } = renderHook(() => useChatChannel(args))

    await act(async () => {
      result.current.requestCorrection('go')
      await new Promise((r) => setTimeout(r, 20))
    })

    const errorEntries = args.replace.mock.calls.filter(
      (call) => (call[1] as { kind: string }).kind === 'chat-error',
    )
    expect(errorEntries).toHaveLength(1)
    expect((errorEntries[0]![1] as { text: string }).text).toBe(
      'the tutor is temporarily unavailable',
    )
    expect(result.current.isQuotaExhausted).toBe(false)
  })

  it('a successful request keeps isQuotaExhausted false', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeSseResponse('ok'))
    const { result } = renderHook(() => useChatChannel(baseArgs()))

    await act(async () => {
      result.current.send('hi')
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(result.current.isQuotaExhausted).toBe(false)
  })
})
