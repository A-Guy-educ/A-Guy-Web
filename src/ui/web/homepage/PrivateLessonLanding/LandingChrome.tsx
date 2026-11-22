import Link from 'next/link'

import { BrandLogo } from '@/ui/web/BrandLogo'

import { START_PAGE_HREF, type Translate } from './landingShared'

/** The demo's own header: `/` is a chromeless route, so the site header isn't there. */
export function LandingHeader({ t }: { t: Translate }) {
  return (
    <header className="pl-header">
      <nav className="wrap pl-nav">
        <a className="pl-logo" href="#" aria-label={t('header.home')}>
          <BrandLogo />
        </a>
        <div className="navlinks">
          <a href="#example">{t('header.example')}</a>
          <a href="#teachers">{t('header.teachers')}</a>
          <a href="#comparison">{t('header.comparison')}</a>
        </div>
        <a className="btn navcta" href={START_PAGE_HREF}>
          {t('header.cta')}
        </a>
      </nav>
    </header>
  )
}

/** Returning students sign in from here; new ones start from any CTA above. */
export function LandingFooter({ t }: { t: Translate }) {
  return (
    <footer className="wrap pl-footer">
      <span className="pl-logo" aria-hidden="true">
        <BrandLogo />
      </span>
      <span>{t('footer.tagline')}</span>
      <Link href="/login">{t('footer.enter')}</Link>
    </footer>
  )
}
