/**
 * School Signup Page — /schools (demo)
 *
 * Landing page for students arriving from a school partnership: student +
 * parent details, school picker, school code, plan choice. UI only for now —
 * the school list and codes are hardcoded in `_lib/demo-data.ts` and submit
 * doesn't persist or charge. Hidden on production until the backend exists.
 *
 * @fileType page
 * @domain schools
 */

import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { SchoolSignupForm } from './_components/SchoolSignupForm'
import { SchoolsHeader } from './_components/SchoolsHeader'

export const dynamic = 'force-dynamic'

export default async function SchoolsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const locale = await getSystemLocale()

  return (
    <div className="min-h-screen text-card-foreground antialiased" dir={getDirection(locale)}>
      <SchoolsHeader />
      <div className="mx-auto max-w-6xl px-6 py-section-md">
        {/* useSearchParams (for ?code= prefill) needs a Suspense boundary. */}
        <Suspense>
          <SchoolSignupForm />
        </Suspense>
      </div>
    </div>
  )
}

export async function generateMetadata() {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'הרשמה לבתי ספר' : 'School signup',
    description: isHebrew
      ? 'הרשמה ל-A-Guy דרך בית הספר שלך'
      : 'Sign up for A-Guy through your school',
    noIndex: true,
  })
}
