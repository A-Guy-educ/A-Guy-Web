import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getContentDb } from '@/infra/db/content-db'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { idCandidates } from '@/server/web-api/progress'

const BodySchema = z.object({
  code: z.string().trim().min(1),
})

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'code_required' }, { status: 400 })
  }

  const db = await getContentDb()
  const code = parsed.data.code.trim().toUpperCase()
  const accessCode = await db
    .collection('access-codes')
    .findOne({ code }, { collation: { locale: 'en', strength: 2 } })

  if (!accessCode)
    return NextResponse.json({ success: false, error: 'invalid_code' }, { status: 404 })
  if (!accessCode.isActive) {
    return NextResponse.json({ success: false, error: 'code_inactive' }, { status: 400 })
  }
  if (accessCode.expiresAt && new Date(accessCode.expiresAt) < new Date()) {
    return NextResponse.json({ success: false, error: 'code_expired' }, { status: 400 })
  }

  const courseId = String(accessCode.course)
  const userIds = idCandidates(user.id)
  const courseIds = idCandidates(courseId)
  const existing = await db.collection('user-entitlements').findOne({
    user: { $in: userIds },
    course: { $in: courseIds },
  })
  const existingEnrollment = await db.collection('enrollments').findOne({
    user: { $in: userIds },
    course: { $in: courseIds },
    status: { $ne: 'cancelled' },
  })

  if (existing || existingEnrollment) {
    return NextResponse.json({ success: false, error: 'already_entitled' }, { status: 409 })
  }

  const maxUses = Number(accessCode.maxUses || 0)
  const incrementFilter: Record<string, unknown> = {
    _id: accessCode._id,
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  }
  if (maxUses > 0) incrementFilter.currentUses = { $lt: maxUses }

  const increment = await db.collection('access-codes').updateOne(incrementFilter, {
    $inc: { currentUses: 1 },
    $set: { updatedAt: new Date() },
  })

  if (!increment.modifiedCount) {
    return NextResponse.json({ success: false, error: 'code_exhausted' }, { status: 409 })
  }

  const now = new Date()
  const userValue = ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id
  const courseValue = ObjectId.isValid(courseId) ? new ObjectId(courseId) : courseId

  await Promise.all([
    db.collection('user-entitlements').insertOne({
      tenant: accessCode.tenant,
      user: userValue,
      contentType: 'course',
      course: courseValue,
      grantMethod: 'code',
      accessCode: accessCode._id,
      createdAt: now,
      updatedAt: now,
    }),
    db.collection('enrollments').insertOne({
      tenant: accessCode.tenant,
      user: userValue,
      course: courseValue,
      status: 'active',
      grantMethod: 'code',
      source: 'self',
      enrolledAt: now,
      metadata: { accessCodeId: accessCode._id.toString() },
      createdAt: now,
      updatedAt: now,
    }),
  ])

  return NextResponse.json({ success: true, courseId })
}
