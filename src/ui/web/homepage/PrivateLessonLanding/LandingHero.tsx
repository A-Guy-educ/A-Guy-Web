import { Sparkles } from 'lucide-react'
import Link from 'next/link'

import { BrandLogo } from '@/ui/web/BrandLogo'

import { PRIMARY_CTA_CLASS, START_HREF, type Translate } from './landingShared'

export function LandingHero({ t }: { t: Translate }) {
  return (
    <section className="relative overflow-hidden border-b border-border px-4 pb-section-lg pt-section-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[480px] max-w-5xl rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-content-gap-xl md:grid-cols-2">
        <div className="text-center md:text-start">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-body-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            {t('hero.badge')}
          </span>
          <h1 className="mt-6 text-display-md font-extrabold leading-tight text-foreground md:text-display-lg">
            {t('hero.headline')}
            <span className="mt-2 block italic text-primary">{t('hero.question')}</span>
          </h1>
          <p className="mt-6 text-heading-lg font-semibold text-foreground">{t('hero.prep')}</p>
          <p className="mt-2 text-heading-md text-muted-foreground">{t('hero.benefit')}</p>
          <div className="mt-8 flex flex-col items-center gap-content-gap-sm md:items-start">
            <a href={START_HREF} className={PRIMARY_CTA_CLASS}>
              {t('hero.cta')}
            </a>
            <Link
              href="/login"
              className="text-body-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-primary"
            >
              {t('hero.login')}
            </Link>
          </div>
        </div>
        {/* Placeholder visual until the demo's student photo is added to the design assets. */}
        <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-[2.5rem] border border-border bg-card shadow-elevation-3">
          <BrandLogo className="h-40 w-auto md:h-52" />
        </div>
      </div>
    </section>
  )
}
