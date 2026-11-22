import { MessageCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import {
  fill,
  PRIMARY_CTA_CLASS,
  SECONDARY_CTA_CLASS,
  START_HREF,
  SUBSCRIPTIONS_HREF,
  whatsappHref,
  type Translate,
} from './landingShared'

export function LandingOffer({ t, price }: { t: Translate; price: number }) {
  return (
    <section className="px-4 py-section-lg">
      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-primary bg-card p-card-padding text-center shadow-elevation-3 md:p-card-padding-lg">
        <p className="text-heading-md font-semibold text-muted-foreground">{t('offer.eyebrow')}</p>
        <h2 className="mt-3 text-display-sm font-extrabold text-foreground md:text-display-md">
          {fill(t('offer.headline'), { price })}
        </h2>
        <p className="mt-3 inline-flex items-center gap-1.5 text-body-lg font-semibold text-success">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          {t('offer.guarantee')}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-content-gap-sm sm:flex-row">
          <Link href={SUBSCRIPTIONS_HREF} className={PRIMARY_CTA_CLASS}>
            {fill(t('offer.cta'), { price })}
          </Link>
          <a href={START_HREF} className={SECONDARY_CTA_CLASS}>
            {t('offer.free')}
          </a>
        </div>
        <a
          href={whatsappHref(t('offer.whatsappMessage'))}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-body-md font-medium text-success underline underline-offset-4 hover:opacity-80"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          {t('offer.whatsapp')}
        </a>
      </div>
    </section>
  )
}
