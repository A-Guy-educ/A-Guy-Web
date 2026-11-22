'use client'

/**
 * The public landing page at `/`, ported from the boss's private-lesson demo:
 * hero, the first-month offer, how a lesson works, the teacher picker,
 * what you learn, and the price comparison. Every "start" CTA leads to the
 * teacher picker, which continues into /start (course → sign-in). Prices come
 * from the tier constants so the page can't drift from checkout. The site
 * header (and its hamburger menu) stays visible.
 *
 * @fileType component
 * @domain frontend
 */
import { TIER_PRICE_ILS } from '@/lib/tiers'
import { cn } from '@/infra/utils/ui'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'

import { LandingComparison } from './LandingComparison'
import { LandingHero } from './LandingHero'
import { LandingLearn } from './LandingLearn'
import { LandingMethod } from './LandingMethod'
import { LandingOffer } from './LandingOffer'
import { LandingTeachers } from './LandingTeachers'
import { PRIMARY_CTA_CLASS, START_HREF } from './landingShared'

export function PrivateLessonLanding() {
  const t = useTranslations('privateLessonLanding')
  const locale = useLocale()

  return (
    <main
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      className="min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      <LandingHero t={t} />
      <LandingOffer t={t} price={TIER_PRICE_ILS.basic} />
      <LandingMethod t={t} />
      <LandingTeachers t={t} />
      <LandingLearn t={t} />
      <LandingComparison t={t} />

      <section className="bg-primary px-4 py-section-xl text-center text-primary-foreground">
        <h2 className="text-display-sm font-extrabold md:text-display-md">{t('closing.title')}</h2>
        <p className="mt-3 text-heading-lg text-primary-foreground/80">{t('closing.tagline')}</p>
        <a
          href={START_HREF}
          className={cn(
            PRIMARY_CTA_CLASS,
            'mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90',
          )}
        >
          {t('closing.cta')}
        </a>
      </section>
    </main>
  )
}
