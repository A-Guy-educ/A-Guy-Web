import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildCheckInstructions,
  CHECK_RETRY_MESSAGE,
  parseCheckReply,
} from '@/server/services/notebook-check/check-prompt'
import {
  runNotebookCheck,
  type NotebookCheckDependencies,
  type NotebookCheckInput,
} from '@/server/services/notebook-check/notebook-check'
import { TutorChatError } from '@/infra/types/tutor-chat'

vi.mock('@/server/services/llm-usage', () => ({
  recordLlmUsage: vi.fn(),
  checkTokenLimit: vi.fn(),
}))
vi.mock('@/server/services/tutor-chat/runtime', () => ({ createTutorModelGateway: vi.fn() }))
vi.mock('@/server/web-api/chat-attachments', () => ({ loadAttachmentPart: vi.fn() }))
vi.mock('@/server/services/media', () => ({ findOwnedMedia: vi.fn() }))

const REPLY = '<reading>x = 8</reading>\n<verdict>incorrect</verdict>\nבדקו שוב את הצעד הראשון.'
const CUT_PART = { inlineData: { mimeType: 'image/png', data: 'cut-bytes' } }

const input: NotebookCheckInput = {
  ownerId: 'student-1',
  contextKey: 'lessons:lesson-1',
  inkBase64: 'ink-bytes',
  exerciseMediaId: 'cut-1',
  locale: 'he',
  includeDebug: false,
  traceId: 'trace-1',
}

function deps() {
  return {
    gateway: {
      generate: vi.fn().mockResolvedValue({
        text: REPLY,
        inputTokens: 10,
        outputTokens: 5,
        model: 'test-model',
      }),
    },
    conversations: {
      getOrCreate: vi.fn().mockResolvedValue({
        id: 'conversation-1',
        messages: [{ role: 'user', content: 'an earlier exercise' }],
      }),
      appendMessage: vi.fn().mockResolvedValue({}),
      compact: vi.fn().mockResolvedValue(false),
    },
    loadExercise: vi.fn().mockResolvedValue({ part: CUT_PART, url: 'https://blob/cut.png' }),
    enforcePolicy: vi.fn().mockResolvedValue(undefined),
    recordUsage: vi.fn().mockResolvedValue(undefined),
  } satisfies NotebookCheckDependencies
}

let d: ReturnType<typeof deps>
beforeEach(() => {
  d = deps()
})

describe('runNotebookCheck', () => {
  it('labels each image so the model never depends on their order', async () => {
    await runNotebookCheck(input, d)

    expect(d.gateway.generate.mock.calls[0][0].parts).toEqual([
      { text: 'EXERCISE:' },
      CUT_PART,
      { text: 'STUDENT WORK:' },
      { inlineData: { mimeType: 'image/png', data: 'ink-bytes' } },
    ])
  })

  it('does not send earlier conversation messages to the model', async () => {
    await runNotebookCheck(input, d)

    expect(JSON.stringify(d.gateway.generate.mock.calls[0][0])).not.toContain('an earlier exercise')
  })

  it('saves only the reply, with no prompt, images or tags', async () => {
    await runNotebookCheck(input, d)

    expect(d.conversations.appendMessage).toHaveBeenCalledTimes(1)
    const saved = d.conversations.appendMessage.mock.calls[0][2]
    expect(saved).toMatchObject({ role: 'assistant', content: 'בדקו שוב את הצעד הראשון.' })
    expect(saved).not.toHaveProperty('media')
  })

  it('returns debug details only when asked to', async () => {
    const student = await runNotebookCheck(input, d)
    const admin = await runNotebookCheck({ ...input, includeDebug: true }, deps())

    expect(student.debug).toBeUndefined()
    expect(admin.debug).toMatchObject({
      reading: 'x = 8',
      verdict: 'incorrect',
      rawReply: REPLY,
      exerciseUrl: 'https://blob/cut.png',
    })
  })

  it('gives the model extra thinking room for reading and solving', async () => {
    await runNotebookCheck(input, d)

    expect(d.gateway.generate.mock.calls[0][0].thinkingBudget).toBe(4096)
  })

  it.each([
    ['came back without its closing tag', '<reading>84x - 126', 'STOP'],
    ['was cut off after the verdict', `${REPLY} חצי משפט`, 'MAX_TOKENS'],
  ])('shows a retry message when the reply %s', async (_name, text, finishReason) => {
    d.gateway.generate.mockResolvedValue({
      text,
      finishReason,
      thoughtsTokens: 1900,
      inputTokens: 900,
      outputTokens: 80,
      model: 'test-model',
    })

    const result = await runNotebookCheck({ ...input, includeDebug: true }, d)

    expect(result.message).toBe(CHECK_RETRY_MESSAGE.he)
    expect(d.conversations.appendMessage).not.toHaveBeenCalled()
    expect(result.debug).toMatchObject({ rawReply: text, finishReason, thoughtsTokens: 1900 })
  })

  it('rejects the check without charging the student when the cut cannot load', async () => {
    d.loadExercise.mockResolvedValue(null)

    await expect(runNotebookCheck(input, d)).rejects.toMatchObject({
      code: 'attachment_unavailable',
    })
    expect(d.enforcePolicy).not.toHaveBeenCalled()
    expect(d.gateway.generate).not.toHaveBeenCalled()
  })

  it('checks a blank page with the handwriting alone', async () => {
    await runNotebookCheck({ ...input, exerciseMediaId: undefined }, d)

    const request = d.gateway.generate.mock.calls[0][0]
    expect(request.parts).toHaveLength(2)
    expect(request.prompt).toContain('No exercise was attached')
    expect(d.loadExercise).not.toHaveBeenCalled()
  })

  it('stores nothing when the model returns no message', async () => {
    d.gateway.generate.mockResolvedValue({
      text: '',
      inputTokens: 0,
      outputTokens: 0,
      model: 'test-model',
    })

    await expect(runNotebookCheck(input, d)).rejects.toBeInstanceOf(TutorChatError)
    expect(d.conversations.appendMessage).not.toHaveBeenCalled()
  })
})

describe('buildCheckInstructions', () => {
  it('tells the model unrelated writing is not a solution', () => {
    const text = buildCheckInstructions({ hasExercise: true, locale: 'he' })
    expect(text).toContain('unrelated')
    expect(text).toContain('Never credit the student')
    expect(text).toContain('Hebrew')
  })
})

describe('parseCheckReply', () => {
  it('separates the transcription and verdict from the message', () => {
    expect(parseCheckReply(REPLY)).toEqual({
      message: 'בדקו שוב את הצעד הראשון.',
      reading: 'x = 8',
      verdict: 'incorrect',
    })
  })

  it('keeps the whole text when the model skips the tags', () => {
    expect(parseCheckReply('Looks fine.')).toEqual({
      message: 'Looks fine.',
      reading: null,
      verdict: null,
    })
  })

  it('drops a verdict outside the allowed list', () => {
    expect(parseCheckReply('<verdict>great</verdict>Hi').verdict).toBeNull()
  })
})
