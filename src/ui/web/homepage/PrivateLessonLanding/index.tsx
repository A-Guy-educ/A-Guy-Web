'use client'

/**
 * The public landing page at `/`, a straight port of the boss's private-lesson
 * demo: same markup, same sizes, same photos (styles in
 * `@/ui/web/privateLesson/private-lesson.css`). Start CTAs open /start;
 * the paid offer opens /subscriptions. Prices come from the tier constants so
 * the page can't drift from checkout. `/` is chromeless, so the demo's own
 * header and footer come with it.
 *
 * @fileType component
 * @domain frontend
 */
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { TIER_PRICE_ILS } from '@/lib/tiers'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'

import { LandingFooter, LandingHeader } from './LandingChrome'
import { LandingComparison } from './LandingComparison'
import { LandingConfidence } from './LandingConfidence'
import { LandingIntro } from './LandingIntro'
import { LandingNeeds } from './LandingNeeds'
import { LandingTeachers } from './LandingTeachers'

import '@/ui/web/privateLesson/private-lesson.css'

interface PrivateLessonLandingProps {
  /** A real exercise for the "try it here" slot; null keeps the demo's placeholder. */
  demoExerciseGroups?: ExerciseBlockGroup[] | null
}

export function PrivateLessonLanding({ demoExerciseGroups = null }: PrivateLessonLandingProps) {
  const t = useTranslations('privateLessonLanding')
  const tp = useTranslations('teacherPersonas')
  const locale = useLocale()

  return (
    <div dir={locale === 'he' ? 'rtl' : 'ltr'} className="pl-landing">
      <LandingHeader t={t} />
      <main>
        <LandingIntro t={t} price={TIER_PRICE_ILS.basic} />
        <LandingConfidence t={t} demoExerciseGroups={demoExerciseGroups} />
        <LandingTeachers t={t} tp={tp} />
        <LandingNeeds t={t} />
        <LandingComparison t={t} />
      </main>
      <LandingFooter t={t} />
    </div>
  )
}
