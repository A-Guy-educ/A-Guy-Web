import { TIER_PRICE_ILS } from '@/lib/tiers'

import { fill, SectionHeading, START_PAGE_HREF, type Translate } from './landingShared'

/** Rows shaded pink in the demo, and the price row that gets the big numbers. */
const ROWS: Array<{ key: string; highlight?: boolean; price?: boolean }> = [
  { key: 'learning', highlight: true },
  { key: 'independence', highlight: true },
  { key: 'cost', price: true },
  { key: 'time' },
  { key: 'availability' },
  { key: 'expertise' },
  { key: 'fit' },
  { key: 'content' },
]

export function LandingComparison({ t }: { t: Translate }) {
  const prices = {
    price: TIER_PRICE_ILS.basic,
    basic: TIER_PRICE_ILS.basic,
    advanced: TIER_PRICE_ILS.advanced,
    premium: TIER_PRICE_ILS.premium,
  }

  return (
    <section className="comparison-section" id="comparison" aria-labelledby="comparison-title">
      <div className="wrap">
        <SectionHeading
          id="comparison-title"
          title={t('comparison.title')}
          description={t('comparison.description')}
        />
        <table className="tutor-comparison">
          <caption className="sr-only">{t('comparison.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{t('comparison.compareLabel')}</span>
              </th>
              <th scope="col" className="comparison-aguy">
                <strong>{t('comparison.aguy')}</strong>
                <span>{t('comparison.aguySub')}</span>
              </th>
              <th scope="col">
                <strong>{t('comparison.tutor')}</strong>
                <span>{t('comparison.tutorSub')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, highlight, price }) => {
              const aguy = fill(t(`comparison.rows.${key}.aguy`), prices)
              const tutor = t(`comparison.rows.${key}.tutor`)
              return (
                <tr key={key} className={highlight ? 'highlight' : price ? 'price-row' : undefined}>
                  <th scope="row">{t(`comparison.rows.${key}.label`)}</th>
                  <td className="comparison-aguy">
                    {price ? <span className="price-value">{aguy}</span> : aguy}
                  </td>
                  <td>
                    {price ? (
                      <span className="price-value" dir="ltr">
                        {tutor}
                      </span>
                    ) : (
                      tutor
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="plan-note">{fill(t('comparison.plans'), prices)}</p>
        <div className="comparison-bottom">
          <a className="btn primary" href={START_PAGE_HREF}>
            {t('comparison.cta')}
          </a>
          <p className="conversion-note">{t('comparison.note')}</p>
        </div>
      </div>
    </section>
  )
}
