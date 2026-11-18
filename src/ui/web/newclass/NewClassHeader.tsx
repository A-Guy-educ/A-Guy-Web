import Link from 'next/link'

import { ContactButton } from './contact/ContactButton'
import { CubeLogo } from './CubeMark'
import { btn, wrap } from './newclassStyles'

const NAV_LINKS = [
  { href: '/newclass#shift', label: 'החזון שלנו' },
  { href: '/newclass#programs', label: 'התוכניות שלנו' },
  { href: '/newclass#challenges', label: 'האתגרים' },
  { href: '/newclass#pilots', label: 'אחרים אומרים עלינו' },
]

const navItem =
  'shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-2.5 text-[15px] text-nc-ink-2 no-underline hover:bg-nc-peach hover:text-nc-ink sm:px-3'

export function NewClassBrand() {
  return (
    <>
      הכיתה החדשה <span className="text-nc-student">3</span>
      <span className="text-nc-teacher">D</span>
    </>
  )
}

// On phones the header scrolls away with the page and the menu is a single
// sideways-scrolling row under the logo; from md up it sticks to the top.
export function NewClassHeader() {
  return (
    <header className="relative z-sticky border-b border-nc-line bg-nc-ground/95 backdrop-blur-md md:sticky md:top-0">
      <div
        className={`${wrap} flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 md:gap-x-6`}
      >
        <Link
          href="/newclass"
          className="flex items-center gap-[10px] font-nc-display text-body-lg font-bold sm:text-heading-xl text-nc-ink no-underline"
        >
          <CubeLogo />
          <span>
            <NewClassBrand />
          </span>
        </Link>
        <Link
          className={`${btn.brand} min-h-10 rounded-full px-4 py-2 text-body-sm md:order-last md:min-h-11 md:px-5 md:py-2.5 md:text-[15px]`}
          href="/classdemo"
        >
          כניסה / הרשמה
        </Link>
        <nav
          aria-label="ניווט ראשי"
          className="-mx-2 flex w-full flex-nowrap gap-0.5 overflow-x-auto md:mx-0 md:w-auto md:flex-1"
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navItem}>
              {link.label}
            </Link>
          ))}
          <ContactButton className={navItem}>צור קשר</ContactButton>
        </nav>
      </div>
    </header>
  )
}
