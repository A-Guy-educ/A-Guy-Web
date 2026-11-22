import { Check, X } from 'lucide-react'

import { TIER_PRICE_ILS } from '@/lib/tiers'

import {
  fill,
  PRIMARY_CTA_CLASS,
  SectionHeading,
  START_HREF,
  type Translate,
} from './landingShared'

const ROWS = [
  'learning',
  'independence',
  'cost',
  'time',
  'availability',
  'expertise',
  'fit',
  'content',
] as const

export function LandingComparison({ t }: { t: Translate }) {
  const prices = {
    price: TIER_PRICE_ILS.basic,
    basic: TIER_PRICE_ILS.basic,
    advanced: TIER_PRICE_ILS.advanced,
    premium: TIER_PRICE_ILS.premium,
  }

  return (
    <section id="comparison" className="scroll-mt-20 px-4 py-section-xl">
      <div className="mx-auto max-w-5xl">
        <SectionHeading title={t('comparison.title')} description={t('comparison.description')} />

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevation-2">
          <table className="w-full table-fixed text-start text-body-sm md:text-body-md">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-1/4 p-3 md:p-card-padding-sm">
                  <span className="sr-only">{t('comparison.title')}</span>
                </th>
                <th
                  scope="col"
                  className="bg-primary/10 p-3 font-bold text-primary md:p-card-padding-sm"
                >
                  {t('comparison.aguy')}
                </th>
                <th
                  scope="col"
                  className="p-3 font-bold text-muted-foreground md:p-card-padding-sm"
                >
                  {t('comparison.tutor')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row} className="border-b border-border last:border-b-0">
                  <th
                    scope="row"
                    className="p-3 font-semibold text-foreground md:p-card-padding-sm"
                  >
                    {t(`comparison.rows.${row}.label`)}
                  </th>
                  <td className="bg-primary/5 p-3 text-foreground md:p-card-padding-sm">
                    <span className="inline-flex items-start gap-1.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {fill(t(`comparison.rows.${row}.aguy`), prices)}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground md:p-card-padding-sm">
                    <span className="inline-flex items-start gap-1.5">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                      {t(`comparison.rows.${row}.tutor`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-body-md text-muted-foreground">
          {fill(t('comparison.plans'), prices)}
        </p>
        <div className="mt-6 text-center">
          <a href={START_HREF} className={PRIMARY_CTA_CLASS}>
            {t('comparison.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}
