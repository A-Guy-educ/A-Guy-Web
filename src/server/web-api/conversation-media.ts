import { ObjectId } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { findConversation, formatConversationResponse } from './chat'

type MessageMedia = { mediaId: string; filename?: string; url?: string; mimeType?: string }

type MediaDoc = {
  _id: ObjectId
  filename?: string
  url?: string
  mimeType?: string
}

/**
 * Tutor-chat turns persist media as bare `{ mediaId }` refs. The Ask page
 * restores its exercise image from history, which needs a URL + filename +
 * MIME type — so resolve them here, owner-scoped, at read time.
 */
async function loadOwnedMedia(ownerId: string, mediaIds: string[]) {
  const validIds = mediaIds.filter(ObjectId.isValid).map((id) => new ObjectId(id))
  if (validIds.length === 0) return new Map<string, MediaDoc>()

  const ownerIdMatch = ObjectId.isValid(ownerId)
    ? { $in: [ownerId, new ObjectId(ownerId)] }
    : ownerId
  const db = await getContentDb()
  const docs = await db
    .collection<MediaDoc>('media')
    .find(
      { _id: { $in: validIds }, createdBy: ownerIdMatch },
      { projection: { filename: 1, url: 1, mimeType: 1 } },
    )
    .toArray()
  return new Map(docs.map((doc) => [doc._id.toString(), doc]))
}

function hydrateMedia(media: MessageMedia, doc: MediaDoc | undefined): MessageMedia {
  if (!doc) return media
  const filename = media.filename || doc.filename
  return {
    ...media,
    filename,
    url: media.url || doc.url || (filename ? `/api/media/file/${filename}` : undefined),
    mimeType: media.mimeType || doc.mimeType,
  }
}

export async function getConversationWithMedia(ownerId: string, contextKey: string) {
  const response = formatConversationResponse(
    await findConversation(ownerId, contextKey),
    contextKey,
  )
  const mediaIds = response.messages.flatMap((m) => (m.media ?? []).map((item) => item.mediaId))
  if (mediaIds.length === 0) return response

  const mediaById = await loadOwnedMedia(ownerId, [...new Set(mediaIds)])
  return {
    ...response,
    messages: response.messages.map((message) =>
      message.media
        ? {
            ...message,
            media: message.media.map((item) => hydrateMedia(item, mediaById.get(item.mediaId))),
          }
        : message,
    ),
  }
}
