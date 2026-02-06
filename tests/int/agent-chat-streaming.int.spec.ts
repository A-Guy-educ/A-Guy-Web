/**
 * Integration tests for the /api/agent/chat/stream endpoint (streaming chat).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { agentChatStream } from '@/server/payload/endpoints/agent/chat-stream'
import config from '@payload-config'
import type { Payload, PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const hasDatabaseUrl = !!process.env.DATABASE_URL

const mockStreamChunks = ['Hello', ' there', '! How', ' can', ' I', ' help', '?']

vi.mock('@/infra/llm/services/exercise-chat-service', () => ({
  streamChatWithExerciseHelper: vi.fn(async function* () {
    for (const chunk of mockStreamChunks) {
      yield { text: chunk }
    }
    return { success: true, message: mockStreamChunks.join('') }
  }),
}))

let payload: Payload
let testUserId: string
let testExerciseId: string
let testChapterId: string

describe.skipIf(!hasDatabaseUrl)('agentChatStream', () => {
  beforeAll(async () => {
    if (!hasDatabaseUrl) return
    payload = await getPayload({ config })
    const user = await payload.create({
      collection: 'users',
      data: {
        email: `test-stream-${Date.now()}@example.com`,
        password: 'test-password',
        roles: ['user'],
      },
      draft: true,
    } as any)
    testUserId = user.id
    testChapterId = (
      await payload.create({
        collection: 'chapters',
        data: {
          title: 'Test Chapter Stream',
          slug: `test-chapter-stream-${Date.now()}`,
          order: 1,
          isPremium: false,
        },
        draft: true,
      } as any)
    ).id
    testExerciseId = (
      await payload.create({
        collection: 'exercises',
        data: {
          title: 'Test Exercise Stream',
          slug: `test-exercise-stream-${Date.now()}`,
          chapter: testChapterId,
          order: 1,
          type: 'free_response',
          status: 'published',
          isPremium: false,
          prompt: 'Solve this math problem',
          hint: 'Think step by step',
          solution: 'The answer is 42',
          answer: '42',
        },
        draft: true,
      } as any)
    ).id
  }, 60000)

  afterAll(async () => {
    if (!hasDatabaseUrl || !payload) return
    try {
      await payload.delete({
        collection: 'exercises',
        id: testExerciseId,
        overrideAccess: true,
      } as any)
      await payload.delete({
        collection: 'chapters',
        id: testChapterId,
        overrideAccess: true,
      } as any)
    } catch {}
  })

  it('returns 401 when user is not authenticated', async () => {
    const req = {
      payload,
      user: null,
      json: async () => ({ message: 'Hello', acknowledgment: 'ack', exerciseId: testExerciseId }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.status).toBe(401)
  })

  it('returns 400 when message is missing', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({ acknowledgment: 'ack', exerciseId: testExerciseId }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.status).toBe(400)
  })

  it('returns 400 when acknowledgment is missing', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({ message: 'Hello', exerciseId: testExerciseId }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.status).toBe(400)
  })

  it('returns 400 when context is missing', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({ message: 'Hello', acknowledgment: 'ack' }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.status).toBe(400)
  })

  it('returns 400 when mediaIds are provided', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({
        message: 'Hello',
        acknowledgment: 'ack',
        exerciseId: testExerciseId,
        mediaIds: ['some-media-id'],
      }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.status).toBe(400)
    const errorBody = await response.json()
    expect(errorBody.error).toContain('media attachments are not supported')
  })

  it('returns 400 when adminMode is true', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({
        message: 'Hello',
        acknowledgment: 'ack',
        exerciseId: testExerciseId,
        adminMode: true,
      }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.status).toBe(400)
    const errorBody = await response.json()
    expect(errorBody.error).toContain('admin mode is not supported')
  })

  it('returns SSE stream with correct headers', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({ message: 'Hello', acknowledgment: 'ack', exerciseId: testExerciseId }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('yields chunk events in SSE format', async () => {
    const req = {
      payload,
      user: { id: testUserId } as PayloadRequest['user'],
      json: async () => ({ message: 'Hello', acknowledgment: 'ack', exerciseId: testExerciseId }),
    } as unknown as PayloadRequest & { json: () => Promise<unknown> }
    const response = await agentChatStream(req)
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    const decoder = new TextDecoder()
    let chunks = ''
    let done = false
    while (!done) {
      const { value, done: doneReading } = await reader!.read()
      done = doneReading
      chunks += decoder.decode(value, { stream: true })
    }
    expect(chunks).toContain('event: chunk')
    expect(chunks).toContain('event: done')
    expect(chunks).toContain('data: ')
    for (const chunk of mockStreamChunks) {
      expect(chunks).toContain(chunk)
    }
  })
})
