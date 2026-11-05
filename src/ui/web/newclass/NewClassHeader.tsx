import Link from 'next/link'

import { ContactButton } from './contact/ContactButton'
import { CubeLogo } from './CubeMark'
import { btn, wrap } from './newclassStyles'

const NAV_LINKS = [
  { href: '/newclass#shift', label: 'הכיתה החדשה' },
  { href: '/newclass#dims', label: 'שלושת הממדים' },
  { href: '/newclass/aguy', label: 'A-guy' },
  { href: '/newclass#programs', label: 'התוכניות' },
  { href: '/newclass#challenges', label: 'האתגרים' },
  { href: '/newclass#pilots', label: 'פיילוטים' },
  { href: '/newclass#about', label: 'מי אנחנו' },
]

export function NewClassBrand() {
  return (
    <>
      הכיתה החדשה <span className="text-nc-student">3</span>
      <span className="text-nc-teacher">D</span>
    </>
  )
}

export function NewClassHeader() {
  return (
    <header className="sticky top-0 z-sticky border-b border-nc-line bg-nc-ground/95 backdrop-blur-md">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 py-3`}>
        <div className="flex flex-wrap items-center gap-6">
          <Link
            href="/newclass"
            className="flex items-center gap-2.5 font-nc-display text-xl font-bold text-nc-ink no-underline"
          >
            <CubeLogo />
            <span>
              <NewClassBrand />
            </span>
          </Link>
          <nav aria-label="ניווט ראשי" className="flex flex-wrap gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-[15px] text-nc-ink-2 no-underline hover:bg-nc-peach hover:text-nc-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <ContactButton className={`${btn.brand} rounded-full px-5 py-2.5 text-[15px]`}>
          צרו קשר
        </ContactButton>
      </div>
    </header>
  )
}
