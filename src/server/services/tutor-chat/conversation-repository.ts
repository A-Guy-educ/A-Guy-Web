import { ObjectId, type Collection, type Document, type Filter } from 'mongodb'

import { getContentDb, objectIdFromString, serializeDoc } from '@/infra/db/content-db'
import { TutorChatError } from '@/infra/types/tutor-chat'

export type TutorStoredMessage = {
  id: string
  turnId?: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  hidden?: boolean
  media?: Array<{ mediaId: string; filename?: string; url?: string }>
  chatAssets?: Array<{ chatAssetId: string; filename?: string }>
}

export type TutorConversation = {
  id: string
  user: unknown
  contextKey: string
  messages: TutorStoredMessage[]
  summary?: string
  updatedAt?: string | Date
}

export type NewTutorMessage = Omit<TutorStoredMessage, 'id' | 'timestamp'> & {
  timestamp?: string
}

export interface TutorConversationRepository {
  getOrCreate(ownerId: string, contextKey: string): Promise<TutorConversation>
  claimTurn(ownerId: string, conversationId: string, turnId: string): Promise<boolean>
  releaseTurn(ownerId: string, conversationId: string, turnId: string): Promise<void>
  discardTurn(ownerId: string, conversationId: string, turnId: string): Promise<void>
  appendMessage(
    ownerId: string,
    conversationId: string,
    message: NewTutorMessage,
  ): Promise<TutorStoredMessage>
  compact(ownerId: string, conversationId: string): Promise<boolean>
}

const SUMMARY_THRESHOLD = 40
const RECENT_MESSAGE_WINDOW = 20
const SUMMARY_MAX_CHARS = 12_000
const TURN_LEASE_MS = 90_000

function ownerMatch(ownerId: string) {
  return ObjectId.isValid(ownerId) ? { $in: [ownerId, new ObjectId(ownerId)] } : ownerId
}

function canonicalOwner(ownerId: string): string | ObjectId {
  return ObjectId.isValid(ownerId) ? new ObjectId(ownerId) : ownerId
}

function splitContextKey(contextKey: string) {
  const [relationTo, ...rest] = contextKey.split(':')
  return { relationTo, value: rest.join(':') }
}

function asConversation(document: Document): TutorConversation {
  const serialized = serializeDoc<Record<string, unknown>>(document)
  return {
    id: String(serialized.id),
    user: serialized.user,
    contextKey: String(serialized.contextKey),
    messages: Array.isArray(serialized.messages)
      ? (serialized.messages as TutorStoredMessage[])
      : [],
    ...(typeof serialized.summary === 'string' ? { summary: serialized.summary } : {}),
    ...(serialized.updatedAt ? { updatedAt: serialized.updatedAt as string | Date } : {}),
  }
}

export function buildCompactedConversation(input: {
  messages: TutorStoredMessage[]
  summary?: string
}): {
  summary: string
  messages: TutorStoredMessage[]
  summaryUntilTimestamp: string
} | null {
  if (input.messages.length <= SUMMARY_THRESHOLD) return null

  const splitAt = input.messages.length - RECENT_MESSAGE_WINDOW
  const older = input.messages.slice(0, splitAt)
  const recent = input.messages.slice(splitAt)
  const transcript = older
    .map((message) => {
      const content =
        message.content.length > 500 ? message.content.slice(0, 500) + '…' : message.content
      return `${message.role === 'user' ? 'Student' : 'Tutor'}: ${content}`
    })
    .join('\n')
  const combined = [input.summary?.trim(), transcript].filter(Boolean).join('\n')
  const summary =
    combined.length > SUMMARY_MAX_CHARS
      ? `[Earlier context omitted]\n${combined.slice(-SUMMARY_MAX_CHARS)}`
      : combined

  return {
    summary,
    messages: recent,
    summaryUntilTimestamp: older[older.length - 1]?.timestamp || new Date().toISOString(),
  }
}

export class MongoTutorConversationRepository implements TutorConversationRepository {
  private async collection(): Promise<Collection<Document>> {
    const db = await getContentDb()
    return db.collection('conversations')
  }

  async getOrCreate(ownerId: string, contextKey: string): Promise<TutorConversation> {
    const conversations = await this.collection()
    const filter = {
      user: ownerMatch(ownerId),
      contextKey,
      archivedAt: { $exists: false },
    } as Filter<Document>
    const existing = await conversations.findOne(filter)
    if (existing) return asConversation(existing)

    const now = new Date()
    const document = {
      user: canonicalOwner(ownerId),
      contextKey,
      contextRef: splitContextKey(contextKey),
      preferredLocale: 'he',
      messages: [],
      lastMessageAt: now,
      contextPolicyVersion: 'tutor-v2',
      createdAt: now,
      updatedAt: now,
    }

    try {
      const result = await conversations.insertOne(document)
      const created = await conversations.findOne({ _id: result.insertedId })
      if (!created) throw new Error('Conversation was not persisted')
      return asConversation(created)
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error
      const raced = await conversations.findOne(filter)
      if (!raced) throw error
      return asConversation(raced)
    }
  }

  async claimTurn(ownerId: string, conversationId: string, turnId: string): Promise<boolean> {
    const conversations = await this.collection()
    const now = new Date()
    const result = await conversations.updateOne(
      {
        _id: objectIdFromString(conversationId),
        user: ownerMatch(ownerId),
        archivedAt: { $exists: false },
        $or: [
          { activeTutorTurn: { $exists: false } },
          { 'activeTutorTurn.expiresAt': { $lte: now } },
        ],
      } as Filter<Document>,
      {
        $set: {
          activeTutorTurn: { id: turnId, expiresAt: new Date(now.getTime() + TURN_LEASE_MS) },
          updatedAt: now,
        },
      },
    )
    return result.modifiedCount === 1
  }

  async releaseTurn(ownerId: string, conversationId: string, turnId: string): Promise<void> {
    const conversations = await this.collection()
    await conversations.updateOne(
      {
        _id: objectIdFromString(conversationId),
        user: ownerMatch(ownerId),
        'activeTutorTurn.id': turnId,
      } as Filter<Document>,
      { $unset: { activeTutorTurn: '' }, $set: { updatedAt: new Date() } },
    )
  }

  async discardTurn(ownerId: string, conversationId: string, turnId: string): Promise<void> {
    const conversations = await this.collection()
    await conversations.updateOne(
      {
        _id: objectIdFromString(conversationId),
        user: ownerMatch(ownerId),
        archivedAt: { $exists: false },
      } as Filter<Document>,
      {
        $pull: { messages: { turnId } },
        $set: { updatedAt: new Date() },
      } as Document,
    )
  }

  async appendMessage(
    ownerId: string,
    conversationId: string,
    message: NewTutorMessage,
  ): Promise<TutorStoredMessage> {
    const conversations = await this.collection()
    const stored: TutorStoredMessage = {
      id: new ObjectId().toString(),
      timestamp: message.timestamp || new Date().toISOString(),
      turnId: message.turnId,
      role: message.role,
      content: message.content,
      ...(message.hidden !== undefined ? { hidden: message.hidden } : {}),
      ...(message.media ? { media: message.media } : {}),
      ...(message.chatAssets ? { chatAssets: message.chatAssets } : {}),
    }
    const duplicateFilter = message.turnId
      ? {
          messages: {
            $not: { $elemMatch: { turnId: message.turnId, role: message.role } },
          },
        }
      : {}

    const result = await conversations.updateOne(
      {
        _id: objectIdFromString(conversationId),
        user: ownerMatch(ownerId),
        archivedAt: { $exists: false },
        ...duplicateFilter,
      } as Filter<Document>,
      {
        $push: { messages: stored },
        $set: {
          updatedAt: new Date(),
          lastMessageAt: new Date(stored.timestamp),
        },
      } as Document,
    )

    if (result.matchedCount === 0 && !message.turnId) {
      throw new TutorChatError('internal_error', 'Conversation not found')
    }
    return stored
  }

  async compact(ownerId: string, conversationId: string): Promise<boolean> {
    const conversations = await this.collection()
    const document = await conversations.findOne({
      _id: objectIdFromString(conversationId),
      user: ownerMatch(ownerId),
      archivedAt: { $exists: false },
    } as Filter<Document>)
    if (!document) return false

    const compacted = buildCompactedConversation({
      messages: Array.isArray(document.messages) ? (document.messages as TutorStoredMessage[]) : [],
      summary: typeof document.summary === 'string' ? document.summary : '',
    })
    if (!compacted) return false

    const result = await conversations.updateOne(
      {
        _id: document._id,
        user: ownerMatch(ownerId),
        updatedAt: document.updatedAt,
      } as Filter<Document>,
      {
        $set: {
          summary: compacted.summary,
          summaryUpdatedAt: new Date(),
          summaryUntilTimestamp: compacted.summaryUntilTimestamp,
          messages: compacted.messages,
          updatedAt: new Date(),
        },
      },
    )
    return result.modifiedCount === 1
  }
}

export const TUTOR_CONVERSATION_POLICY = {
  summaryThreshold: SUMMARY_THRESHOLD,
  recentMessageWindow: RECENT_MESSAGE_WINDOW,
  summaryMaxChars: SUMMARY_MAX_CHARS,
  turnLeaseMs: TURN_LEASE_MS,
} as const
