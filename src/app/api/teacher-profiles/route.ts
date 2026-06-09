import { NextRequest, NextResponse } from 'next/server'

import { getContentDb, serializeDoc } from '@/infra/db/content-db'

function localeFromRequest(request: NextRequest) {
  return (
    request.cookies.get('NEXT_LOCALE')?.value || request.cookies.get('aguy-locale')?.value || 'he'
  )
}

export async function GET(request: NextRequest) {
  const db = await getContentDb()
  const locale = localeFromRequest(request)
  const docs = await db
    .collection('teacher_profiles')
    .find({
      isEnabled: true,
      $or: [{ locale }, { locale: { $exists: false } }],
    })
    .sort({ locale: -1, createdAt: 1 })
    .toArray()

  const seen = new Set<string>()
  const profiles = docs.flatMap((doc) => {
    const profile = serializeDoc<Record<string, unknown>>(doc)
    const slug = String(profile.slug || '')
    if (!slug || seen.has(slug)) return []
    seen.add(slug)
    return [
      {
        id: String(profile.id),
        slug,
        label: String(profile.label || slug),
        description: String(profile.description || ''),
        isEnabled: profile.isEnabled !== false,
      },
    ]
  })

  return NextResponse.json({ profiles })
}
