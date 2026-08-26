import { TutorChatError } from '@/infra/types/tutor-chat'

export type TutorModelPart = { text: string } | { inlineData: { mimeType: string; data: string } }

export type TutorModelInput = {
  system: string
  prompt: string
  parts: TutorModelPart[]
  signal?: AbortSignal
}

export type TutorModelUsage = {
  inputTokens: number
  outputTokens: number
  model: string
}

export type TutorModelResult = TutorModelUsage & { text: string }

export interface TutorModelGateway {
  generate(input: TutorModelInput): Promise<TutorModelResult>
  stream(input: TutorModelInput): AsyncGenerator<string, TutorModelUsage>
}

type GeminiStreamRecord = {
  text: string
  inputTokens: number
  outputTokens: number
}

type GeminiStreamState = { buffer: string }

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

export function parseGeminiSse(state: GeminiStreamState, chunk: string): GeminiStreamRecord[] {
  state.buffer += chunk
  const records: GeminiStreamRecord[] = []

  while (true) {
    const lfBoundary = state.buffer.indexOf('\n\n')
    const crlfBoundary = state.buffer.indexOf('\r\n\r\n')
    const boundary =
      lfBoundary === -1
        ? crlfBoundary
        : crlfBoundary === -1
          ? lfBoundary
          : Math.min(lfBoundary, crlfBoundary)
    if (boundary === -1) break
    const separatorLength = boundary === crlfBoundary ? 4 : 2
    const event = state.buffer.slice(0, boundary)
    state.buffer = state.buffer.slice(boundary + separatorLength)

    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('')
    if (!data || data === '[DONE]') continue

    let parsed: GeminiResponse
    try {
      parsed = JSON.parse(data) as GeminiResponse
    } catch {
      throw new TutorChatError('provider_error', 'The tutor returned an invalid stream.')
    }

    records.push({
      text: parsed.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '',
      inputTokens: Math.max(0, Number(parsed.usageMetadata?.promptTokenCount || 0)),
      outputTokens: Math.max(0, Number(parsed.usageMetadata?.candidatesTokenCount || 0)),
    })
  }

  return records
}

export class GeminiTutorModelGateway implements TutorModelGateway {
  private readonly apiKey: string
  private readonly model: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(options: {
    apiKey: string
    model: string
    fetchImpl?: typeof fetch
    timeoutMs?: number
  }) {
    this.apiKey = options.apiKey
    this.model = options.model
    this.fetchImpl = options.fetchImpl || fetch
    this.timeoutMs = options.timeoutMs ?? 45_000
  }

  private signal(inputSignal?: AbortSignal): AbortSignal {
    const timeout = AbortSignal.timeout(this.timeoutMs)
    return inputSignal ? AbortSignal.any([inputSignal, timeout]) : timeout
  }

  private requestBody(input: TutorModelInput) {
    return JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [
        {
          role: 'user',
          parts: [...input.parts, { text: input.prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })
  }

  private async request(path: 'generateContent' | 'streamGenerateContent', input: TutorModelInput) {
    const suffix =
      path === 'streamGenerateContent' ? ':streamGenerateContent?alt=sse' : ':generateContent'
    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}${suffix}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: this.requestBody(input),
        signal: this.signal(input.signal),
      },
    )

    if (!response.ok) {
      throw new TutorChatError('provider_error', 'The tutor provider rejected the request.', {
        traceId: response.headers.get('x-request-id') || undefined,
      })
    }
    return response
  }

  async generate(input: TutorModelInput): Promise<TutorModelResult> {
    const response = await this.request('generateContent', input)
    const parsed = (await response.json()) as GeminiResponse
    return {
      text: parsed.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '',
      inputTokens: Math.max(0, Number(parsed.usageMetadata?.promptTokenCount || 0)),
      outputTokens: Math.max(0, Number(parsed.usageMetadata?.candidatesTokenCount || 0)),
      model: this.model,
    }
  }

  async *stream(input: TutorModelInput): AsyncGenerator<string, TutorModelUsage> {
    const response = await this.request('streamGenerateContent', input)
    const reader = response.body?.getReader()
    if (!reader) throw new TutorChatError('provider_error', 'The tutor stream is unavailable.')

    const decoder = new TextDecoder()
    const state = { buffer: '' }
    let inputTokens = 0
    let outputTokens = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const record of parseGeminiSse(state, decoder.decode(value, { stream: true }))) {
          inputTokens = Math.max(inputTokens, record.inputTokens)
          outputTokens = Math.max(outputTokens, record.outputTokens)
          if (record.text) yield record.text
        }
      }
      const trailing = decoder.decode()
      if (trailing) {
        for (const record of parseGeminiSse(state, trailing)) {
          inputTokens = Math.max(inputTokens, record.inputTokens)
          outputTokens = Math.max(outputTokens, record.outputTokens)
          if (record.text) yield record.text
        }
      }
    } finally {
      reader.releaseLock()
    }

    return { inputTokens, outputTokens, model: this.model }
  }
}
