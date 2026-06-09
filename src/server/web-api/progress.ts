import { ObjectId, type Document } from 'mongodb'

import { getContentDb, relationId, serializeDoc } from '@/infra/db/content-db'

export const USER_PROGRESS_COLLECTION = 'user-progresses'
export const USER_STATS_COLLECTION = 'user-stats'

export type ProgressRecord = {
  id?: string
  recordType: 'lesson' | 'exercise' | 'chapter' | string
  recordId: string
  completionPercentage?: number
  status?: string
  score?: number
  timeSpentSeconds?: number
  lastAccessedAt?: string
}

export type UserProgressDoc = {
  id: string
  user: string
  gradeLevel?: string
  progressRecords?: ProgressRecord[]
  studyPlans?: unknown[]
}

export function idCandidates(id: string) {
  return ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id]
}

export function userFilter(userId: string): Document {
  return { user: { $in: idCandidates(userId) } }
}

export async function defaultTenantId() {
  const db = await getContentDb()
  const slug = process.env.DEFAULT_TENANT_SLUG || 'AGuy'
  const tenant = await db.collection('tenants').findOne({ slug }, { projection: { _id: 1 } })
  return tenant?._id ?? null
}

export async function findUserProgress(userId: string, gradeLevel: string) {
  const db = await getContentDb()
  const doc = await db.collection(USER_PROGRESS_COLLECTION).findOne({
    ...userFilter(userId),
    gradeLevel,
  })
  return doc ? serializeDoc<UserProgressDoc>(doc) : null
}

export async function upsertUserProgress(
  userId: string,
  gradeLevel: string,
  patch: Record<string, unknown>,
) {
  const db = await getContentDb()
  const now = new Date()
  const tenant = await defaultTenantId()
  const filter = { ...userFilter(userId), gradeLevel }
  const setOnInsert: Record<string, unknown> = {
    user: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
    gradeLevel,
    createdAt: now,
  }
  if (tenant) setOnInsert.tenant = tenant

  await db.collection(USER_PROGRESS_COLLECTION).updateOne(
    filter,
    {
      $set: { ...patch, updatedAt: now },
      $setOnInsert: setOnInsert,
    },
    { upsert: true },
  )

  const doc = await db.collection(USER_PROGRESS_COLLECTION).findOne(filter)
  return doc ? serializeDoc<UserProgressDoc>(doc) : null
}

export async function getOrCreateUserStats(userId: string) {
  const db = await getContentDb()
  const now = new Date()
  const tenant = await defaultTenantId()
  const filter = userFilter(userId)
  const setOnInsert: Record<string, unknown> = {
    user: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
    totalTimeSpentSeconds: 0,
    currentStreak: 0,
    longestStreak: 0,
    activityLog: [],
    createdAt: now,
  }
  if (tenant) setOnInsert.tenant = tenant

  await db.collection(USER_STATS_COLLECTION).updateOne(
    filter,
    {
      $set: { updatedAt: now },
      $setOnInsert: setOnInsert,
    },
    { upsert: true },
  )

  return db.collection(USER_STATS_COLLECTION).findOne(filter)
}

export function relationEquals(value: unknown, id: string) {
  return relationId(value) === id
}
