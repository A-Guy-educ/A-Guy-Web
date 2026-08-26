import { describe, expect, it } from 'vitest'

import { readDataSse } from '@/infra/llm/read-data-sse'

describe('readDataSse', () => {
  it('preserves JSON events split across network chunks', async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"chunk","text":"Hel'))
        controller.enqueue(encoder.encode('lo"}\r\n\r\ndata: {"type":"done"}\n\n'))
        controller.close()
      },
    })

    const events = []
    for await (const event of readDataSse<{ type: string; text?: string }>(body)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'chunk', text: 'Hello' }, { type: 'done' }])
  })
})
