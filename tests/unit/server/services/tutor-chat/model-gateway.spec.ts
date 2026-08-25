import { describe, expect, it } from 'vitest'

import { GeminiTutorModelGateway, parseGeminiSse } from '@/server/services/tutor-chat/model-gateway'

describe('Gemini tutor model gateway', () => {
  it('parses provider SSE across arbitrary network boundaries', () => {
    const state = { buffer: '' }
    const first = parseGeminiSse(state, 'data: {"candidates":[{"content":{"parts":[{"text":"Hel')
    const second = parseGeminiSse(state, 'lo"}]}}],"usageMetadata":{"promptTokenCount":3}}\n\n')

    expect(first).toEqual([])
    expect(second).toEqual([{ text: 'Hello', inputTokens: 3, outputTokens: 0 }])
    expect(state.buffer).toBe('')
  })

  it('accepts CRLF-delimited SSE records', () => {
    const state = { buffer: '' }
    expect(
      parseGeminiSse(
        state,
        'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\r\n\r\n',
      ),
    ).toEqual([{ text: 'Hello', inputTokens: 0, outputTokens: 0 }])
    expect(state.buffer).toBe('')
  })

  it('streams real provider chunks and reports final usage', async () => {
    const encoder = new TextEncoder()
    const fetchImpl = async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"A"}]}}]}\n\n'),
            )
            controller.enqueue(
              encoder.encode(
                'data: {"candidates":[{"content":{"parts":[{"text":"B"}]}}],"usageMetadata":{"promptTokenCount":4,"candidatesTokenCount":2}}\n\n',
              ),
            )
            controller.close()
          },
        }),
        { status: 200 },
      )

    const gateway = new GeminiTutorModelGateway({
      apiKey: 'test-key',
      model: 'test-model',
      fetchImpl: fetchImpl as typeof fetch,
      timeoutMs: 5_000,
    })

    const chunks: string[] = []
    const stream = gateway.stream({ system: 'system', prompt: 'prompt', parts: [] })
    let usage
    while (true) {
      const next = await stream.next()
      if (next.done) {
        usage = next.value
        break
      }
      chunks.push(next.value)
    }

    expect(chunks).toEqual(['A', 'B'])
    expect(usage).toMatchObject({ inputTokens: 4, outputTokens: 2, model: 'test-model' })
  })
})
