'use client'

import { PageTransition } from '@/ui/web/components/page-transition'
import { useTranslations } from '@/ui/web/providers/I18n'

/** `city` and `studyGroup` aren't stored anywhere yet, so they always show as missing. */
interface PersonalDetails {
  firstName?: string | null
  lastName?: string | null
  className?: string | null
  school?: string | null
  city?: string | null
  studyGroup?: string | null
  phone?: string | null
  email?: string | null
}

const FIELDS: Array<keyof PersonalDetails> = [
  'firstName',
  'lastName',
  'className',
  'school',
  'city',
  'studyGroup',
  'phone',
  'email',
]

export function MePageContent({ details }: { details: PersonalDetails }) {
  const t = useTranslations('auth.account')

  return (
    <PageTransition>
      <div className="container py-section-md">
        <div className="mx-auto max-w-2xl space-y-content-gap">
          <h1 className="text-display-sm font-bold">{t('me.title')}</h1>
          <dl className="grid gap-content-gap rounded-lg border bg-card p-card-padding sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field}>
                <dt className="text-body-sm text-muted-foreground">{t(`me.${field}`)}</dt>
                <dd className="text-body-md font-medium">
                  {/* bdi keeps emails and phone numbers intact inside RTL text */}
                  <bdi>{details[field] || t('missing')}</bdi>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </PageTransition>
  )
}
