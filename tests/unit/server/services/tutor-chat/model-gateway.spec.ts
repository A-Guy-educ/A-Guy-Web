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

  function gatewayReturning(model: string, body: unknown) {
    const requests: Array<{ generationConfig: Record<string, unknown> }> = []
    const fetchImpl = async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)))
      return new Response(JSON.stringify(body), { status: 200 })
    }
    const gateway = new GeminiTutorModelGateway({
      apiKey: 'test-key',
      model,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 5_000,
    })
    return { gateway, requests }
  }

  it('leaves room for the answer on top of a capped thinking budget', async () => {
    const { gateway, requests } = gatewayReturning('gemini-2.5-flash', {})

    await gateway.generate({ system: 's', prompt: 'p', parts: [] })
    await gateway.generate({ system: 's', prompt: 'p', parts: [], thinkingBudget: 4096 })

    expect(requests[0].generationConfig).toMatchObject({
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 2048 },
    })
    expect(requests[1].generationConfig).toMatchObject({
      thinkingConfig: { thinkingBudget: 4096 },
    })
  })

  it('sends no thinking budget to models that may reject one', async () => {
    const { gateway, requests } = gatewayReturning('gemini-2.0-flash', {})

    await gateway.generate({ system: 's', prompt: 'p', parts: [] })

    expect(requests[0].generationConfig).not.toHaveProperty('thinkingConfig')
  })

  it('reports why the model stopped and how much it thought', async () => {
    const { gateway } = gatewayReturning('gemini-2.5-flash', {
      candidates: [{ content: { parts: [{ text: 'half' }] }, finishReason: 'MAX_TOKENS' }],
      usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 82, thoughtsTokenCount: 1966 },
    })

    await expect(gateway.generate({ system: 's', prompt: 'p', parts: [] })).resolves.toMatchObject({
      text: 'half',
      finishReason: 'MAX_TOKENS',
      thoughtsTokens: 1966,
    })
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
