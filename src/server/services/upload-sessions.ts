/**
 * Upload Sessions Service
 *
 * @fileType service
 * @domain chat-assets
 * @pattern repository
 * @ai-summary Tracks browser-direct uploads to blob storage: an upload session is opened before a token is issued and closed when the file lands, so an abandoned upload leaves a record rather than nothing.
 */

import { ObjectId, type Document } from 'mongodb'

import { getContentDb, objectIdFromString } from '@/infra/db/content-db'

/**
 * The tenant that owns uploads on this deployment.
 *
 * Returns the tenant `_id` as an ObjectId — the Admin-owned `upload-sessions`,
 * `chat-assets`, and `media` collections all carry a JSON Schema validator
 * that requires `tenant` to be a `bsonType: "objectId"` relationship, so a
 * plain string (or the old `'default'` fallback) is rejected at insert time.
 *
 * Throws when the tenant document is missing rather than silently falling
 * back to a non-existent id: an upload with a bogus tenant would fail
 * validation anyway, and the loud error is easier to diagnose than the
 * generic `Document failed validation` MongoDB returns.
 */
export async function resolveDefaultTenantId(): Promise<ObjectId> {
  const db = await getContentDb()
  const slug = process.env.DEFAULT_TENANT_SLUG || 'AGuy'
  const tenant = await db.collection('tenants').findOne({ slug })

  const id = tenant?._id
  if (!(id instanceof ObjectId)) {
    throw new Error(
      `Default tenant "${slug}" is missing from the tenants collection. ` +
        `Uploads require a tenant document because the Admin schema marks ` +
        `the field as a required relationship.`,
    )
  }

  return id
}

export type NewUploadSession = {
  _id: ObjectId
  tenant: ObjectId
  createdBy: ObjectId
  purpose: string
  originalFilename: string
  mimeType: string
  expectedSize: number
  pathname: string
  expiresAt: Date
}

/**
 * Open a session with the pathname already known.
 *
 * The Admin schema marks `pathname` as required, so the row cannot be inserted
 * without it. Callers pre-generate the session `_id` and derive the pathname
 * from it so the whole row lands in one write instead of an insert-then-update
 * pair that would fail validation on the initial insert.
 */
export async function openUploadSession(session: NewUploadSession): Promise<ObjectId> {
  const db = await getContentDb()
  const now = new Date()

  await db
    .collection('upload-sessions')
    .insertOne({ ...session, status: 'initiated', createdAt: now, updatedAt: now })

  return session._id
}

/**
 * Close the session once blob storage confirms the upload.
 *
 * The id arrives as text here, having travelled to the browser and back in the
 * upload token, so it has to be parsed.
 */
export async function completeUploadSession(
  sessionId: string,
  blob: { url: string; pathname: string },
): Promise<void> {
  const db = await getContentDb()

  await db.collection('upload-sessions').updateOne({ _id: new ObjectId(sessionId) } as Document, {
    $set: {
      blobUrl: blob.url,
      pathname: blob.pathname,
      status: 'uploaded',
      updatedAt: new Date(),
    },
  })
}

/** One upload session by id, or `null`. */
export async function findUploadSessionById(sessionId: string): Promise<Document | null> {
  const db = await getContentDb()
  return db.collection('upload-sessions').findOne({ _id: new ObjectId(sessionId) } as Document)
}

/**
 * Find a caller's unfinished session by the blob it produced, or by the
 * filename it was opened for.
 *
 * Scoped to the owner deliberately: matching on the blob URL alone would let
 * one user finalize another user's upload.
 */
export async function findOwnUploadSessionByBlob(
  ownerId: string,
  blobUrl: string,
  originalFilename?: string,
): Promise<Document | null> {
  const db = await getContentDb()

  // createdBy is stored as ObjectId under the Admin schema, but pre-fix
  // records may still carry the string. objectIdFromString accepts both.
  const createdBy = objectIdFromString(ownerId)

  return db.collection('upload-sessions').findOne({
    createdBy,
    $or: [{ blobUrl }, { originalFilename, status: { $in: ['initiated', 'uploaded'] } }],
  })
}

/** Mark a session finished and point it at the asset it produced. */
export async function finalizeUploadSession(
  sessionId: unknown,
  asset: { chatAssetId: string; blobUrl: string },
): Promise<void> {
  const db = await getContentDb()

  await db.collection('upload-sessions').updateOne({ _id: sessionId } as Document, {
    $set: { status: 'finalized', ...asset, updatedAt: new Date() },
  })
}
