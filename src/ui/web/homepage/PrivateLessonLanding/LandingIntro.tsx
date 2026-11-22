import Image from 'next/image'

import {
  fill,
  START_PAGE_HREF,
  SUBSCRIPTIONS_HREF,
  whatsappHref,
  type Translate,
} from './landingShared'

/** Opening: the 7-hours question, the student photo, and the first-month offer. */
export function LandingIntro({ t, price }: { t: Translate; price: number }) {
  return (
    <section className="independent-intro wrap" aria-labelledby="intro-title">
      <p className="eyebrow">{t('intro.eyebrow')}</p>
      <h1 id="intro-title">
        {t('intro.title')}
        <br />
        <em>{t('intro.question')}</em>
      </h1>
      <p className="intro-prep">
        {t('intro.prepBefore')} <bdi>Aguy</bdi> {t('intro.prepAfter')}
      </p>
      <p className="intro-benefit">{t('intro.benefit')}</p>

      <figure className="independent-figure">
        <Image
          src="/private-lesson/independent-student.webp"
          width={1536}
          height={1024}
          priority
          sizes="(max-width: 1064px) calc(100vw - 40px), 1000px"
          alt={t('intro.imageAlt')}
        />
        <figcaption>{t('intro.caption')}</figcaption>
      </figure>

      <div className="intro-offer">
        <h2>
          {t('offer.headline')} <bdi>Aguy</bdi> <span>{fill(t('offer.price'), { price })}</span>
        </h2>
        <p>{t('offer.guarantee')}</p>
        <a className="btn primary intro-cta" href={SUBSCRIPTIONS_HREF}>
          {fill(t('offer.cta'), { price })}
        </a>
        <div className="intro-secondary">
          <a className="intro-free" href={START_PAGE_HREF}>
            {t('offer.free')}
          </a>
          <div>
            <a
              className="consultation-link"
              href={whatsappHref(t('offer.whatsappMessage'))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5Z" />
                <path d="M8 7.5c-1 2 2 6 5 7 .8.3 2-.6 2.1-1.3l-2-1-1 1c-1.4-.7-2.6-1.9-3-3l.8-.8-1-2Z" />
              </svg>
              <span>{t('offer.whatsapp')}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
