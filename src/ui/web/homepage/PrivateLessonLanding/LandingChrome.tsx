'use client'

import Link from 'next/link'

import { locales, type Locale } from '@/i18n/config'
import { BrandLogo } from '@/ui/web/BrandLogo'
import { useLocaleSwitch } from '@/ui/web/LanguageSwitcher'

import { START_PAGE_HREF, type Translate } from './landingShared'

const LOCALE_SHORT: Record<Locale, string> = { he: 'עב', en: 'EN' }

/**
 * The demo's own header (`/` is a chromeless route, so the site header isn't
 * there), plus a Hebrew/English toggle and a sign-in link for returning students.
 */
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
        <div className="nav-end">
          <LanguageToggle label={t('header.language')} />
          <Link className="nav-login" href="/login">
            <span className="nav-login-lead">{t('header.loginLead')}</span> {t('header.login')}
          </Link>
          <a className="btn navcta" href={START_PAGE_HREF}>
            {t('header.cta')}
          </a>
        </div>
      </nav>
    </header>
  )
}

function LanguageToggle({ label }: { label: string }) {
  const { locale, switchTo, disabled } = useLocaleSwitch()
  if (disabled) return null

  return (
    <div className="lang-toggle" role="group" aria-label={label}>
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          lang={loc}
          aria-pressed={locale === loc}
          onClick={() => locale !== loc && switchTo(loc)}
        >
          {LOCALE_SHORT[loc]}
        </button>
      ))}
    </div>
  )
}

export function LandingFooter({ t }: { t: Translate }) {
  return (
    <footer className="wrap pl-footer">
      <span className="pl-logo" aria-hidden="true">
        <BrandLogo />
      </span>
      <span>{t('footer.tagline')}</span>
    </footer>
  )
}
