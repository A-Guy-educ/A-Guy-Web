import Link from 'next/link'
import type { ReactNode } from 'react'

import { eyebrow, viewH2, viewSection, wrap } from '../newclassStyles'

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
        <p className="max-w-[720px] text-xl text-nc-ink-2">{children}</p>
        <div className="flex flex-wrap gap-3 pt-1.5">{actions}</div>
      </div>
    </section>
  )
}

export function ViewSection({
  title,
  alt,
  id,
  children,
}: {
  title?: string
  alt?: boolean
  id?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`${viewSection} ${alt ? 'bg-nc-paper' : ''}`}>
      <div className={wrap}>
        {title ? <h2 className={viewH2}>{title}</h2> : null}
        {children}
      </div>
    </section>
  )
}

export function PlaceholderGallery({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
      {items.map((item) => (
        <div
          key={item}
          className="flex aspect-[4/3] items-center justify-center rounded-[20px] border border-dashed border-nc-ph-line bg-[repeating-linear-gradient(135deg,hsl(var(--nc-ph-stripe))_0_12px,hsl(var(--nc-ground))_12px_24px)] p-3 text-center text-[15px] text-nc-ink-2"
        >
          {item}
        </div>
      ))}
    </div>
  )
}

export function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex flex-col gap-2 rounded-[20px] border border-nc-line bg-nc-paper p-6"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-nc-brand font-nc-display text-base font-extrabold text-white">
            {i + 1}
          </span>
          <h3 className="font-nc-display text-xl font-bold">{step.title}</h3>
          <p className="text-base text-nc-ink-2">{step.body}</p>
        </li>
      ))}
    </ol>
  )
}

export function PriceCard({ lines, action }: { lines: string[]; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border-2 border-nc-brand bg-nc-paper p-8">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
        <strong className="font-nc-display text-[34px] font-extrabold text-nc-brand-deep">
          [מחיר]
        </strong>
        {lines.map((line) => (
          <span key={line} className="text-nc-ink-2">
            {line}
          </span>
        ))}
      </div>
      {action}
    </div>
  )
}
