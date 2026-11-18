import Link from 'next/link'
import type { ReactNode } from 'react'

import { eyebrow, wrap } from '../newclassStyles'

export function ViewHero({
  kicker,
  title,
  children,
  actions,
}: {
  kicker: string
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <section className="bg-nc-sun pt-[72px] pb-16">
      <div className={`${wrap} flex flex-col gap-5`}>
        <Link
          href="/newclass#programs"
          className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-nc-brand-deep no-underline"
        >
          → חזרה לעמוד הראשי
        </Link>
        <span className={eyebrow}>{kicker}</span>
        <h1 className="max-w-[820px] font-nc-display text-[clamp(34px,4.6vw,56px)] font-extrabold leading-[1.15] text-balance">
          {title}
        </h1>
        <p className="max-w-[720px] text-heading-xl text-nc-ink-2">{children}</p>
        <div className="flex flex-wrap gap-3 pt-1.5">{actions}</div>
      </div>
    </section>
  )
}
