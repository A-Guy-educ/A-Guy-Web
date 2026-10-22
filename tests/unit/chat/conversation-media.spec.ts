import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ownerId = new ObjectId().toString()
const mediaId = new ObjectId()
const find = vi.fn()

vi.mock('@/infra/db/content-db', () => ({
  getContentDb: async () => ({ collection: () => ({ find }) }),
}))

vi.mock('@/server/web-api/chat', () => ({
  findConversation: vi.fn(async () => ({ id: 'c1' })),
  formatConversationResponse: vi.fn(() => ({
    success: true,
    exists: true,
    conversationId: 'c1',
    contextKey: 'ask-1',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'hi',
        timestamp: '',
        media: [{ mediaId: mediaId.toString() }],
      },
      { id: 'm2', role: 'assistant', content: 'hello', timestamp: '' },
    ],
  })),
}))

import { getConversationWithMedia } from '@/server/web-api/conversation-media'

describe('getConversationWithMedia', () => {
  beforeEach(() => {
    find.mockReset()
  })

  it('hydrates bare media refs with url, filename and mimeType (owner-scoped)', async () => {
    find.mockReturnValue({
      toArray: async () => [
        { _id: mediaId, filename: 'q.png', url: 'https://blob/q.png', mimeType: 'image/png' },
      ],
    })

    const result = await getConversationWithMedia(ownerId, 'ask-1')

    expect(result.messages[0].media).toEqual([
      {
        mediaId: mediaId.toString(),
        filename: 'q.png',
        url: 'https://blob/q.png',
        mimeType: 'image/png',
      },
    ])
    expect(result.messages[1].media).toBeUndefined()
    const [filter] = find.mock.calls[0]
    expect(filter.createdBy).toBeDefined()
  })

  it('leaves the ref untouched when the media is not owned by the user', async () => {
    find.mockReturnValue({ toArray: async () => [] })

    const result = await getConversationWithMedia(ownerId, 'ask-1')

    expect(result.messages[0].media).toEqual([{ mediaId: mediaId.toString() }])
  })
})
