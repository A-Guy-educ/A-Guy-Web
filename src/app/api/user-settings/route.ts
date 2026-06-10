import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getContentDb, relationId, serializeDoc } from '@/infra/db/content-db'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { idCandidates } from '@/server/web-api/progress'

const PatchSchema = z.object({
  teacherProfileSlug: z.string().min(1),
})

function localeFromRequest(request: NextRequest) {
  return (
    request.cookies.get('NEXT_LOCALE')?.value || request.cookies.get('aguy-locale')?.value || 'he'
  )
}

async function profileByIdOrSlug(value: unknown, locale: string) {
  const id = relationId(value)
  if (!id) return null
  const db = await getContentDb()
  const stored = ObjectId.isValid(id)
    ? await db.collection('teacher_profiles').findOne({ _id: new ObjectId(id) })
    : await db.collection('teacher_profiles').findOne({ slug: id })
  const slug = stored?.slug
  const localized = slug
    ? await db.collection('teacher_profiles').findOne({
        slug,
        isEnabled: true,
        $or: [{ locale }, { locale: { $exists: false } }],
      })
    : stored
  return localized ? serializeDoc<Record<string, unknown>>(localized) : null
}

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getContentDb()
  const settings = await db
    .collection('user_settings')
    .findOne({ user: { $in: idCandidates(user.id) } })
  const profile = await profileByIdOrSlug(settings?.teacherProfile, localeFromRequest(request))

  return Response.json({
    settings: {
      id: settings?._id?.toString() ?? null,
      teacherProfile: profile
        ? {
            slug: String(profile.slug || ''),
            label: String(profile.label || profile.slug || ''),
            description: String(profile.description || ''),
          }
        : null,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const db = await getContentDb()
  const locale = localeFromRequest(request)
  const profile = await db.collection('teacher_profiles').findOne({
    slug: parsed.data.teacherProfileSlug,
    isEnabled: true,
    $or: [{ locale }, { locale: { $exists: false } }],
  })
  if (!profile)
    return Response.json({ error: 'Teacher profile not found or disabled' }, { status: 404 })

  const now = new Date()
  const userValue = ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id
  await db.collection('user_settings').updateOne(
    { user: { $in: idCandidates(user.id) } },
    {
      $set: { teacherProfile: profile._id, updatedAt: now },
      $setOnInsert: { user: userValue, createdAt: now },
    },
    { upsert: true },
  )

  const settings = await db
    .collection('user_settings')
    .findOne({ user: { $in: idCandidates(user.id) } })
  return Response.json({
    success: true,
    settings: {
      id: settings?._id?.toString() ?? null,
      teacherProfileSlug: parsed.data.teacherProfileSlug,
    },
  })
}
