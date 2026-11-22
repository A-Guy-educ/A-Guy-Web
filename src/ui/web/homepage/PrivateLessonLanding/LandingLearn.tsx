import { BookOpen, ClipboardCheck, NotebookPen, Pencil, type LucideIcon } from 'lucide-react'

import { SectionHeading, START_HREF, type Translate } from './landingShared'

const ITEMS: Array<{ key: string; icon: LucideIcon }> = [
  { key: 'homework', icon: NotebookPen },
  { key: 'fromScratch', icon: BookOpen },
  { key: 'practice', icon: Pencil },
  { key: 'exam', icon: ClipboardCheck },
]

/** The four starting points the course page's guide offers, previewed for visitors. */
export function LandingLearn({ t }: { t: Translate }) {
  return (
    <section className="bg-muted/30 px-4 py-section-xl">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={t('learn.title')} description={t('learn.description')} />
        <div className="grid gap-content-gap-lg sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, icon: Icon }) => (
            <a
              key={key}
              href={START_HREF}
              className="rounded-2xl border border-primary/30 bg-card p-card-padding transition-all duration-normal hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elevation-2"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-heading-xl font-bold text-foreground">
                {t(`learn.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-body-md text-muted-foreground">
                {t(`learn.items.${key}.description`)}
              </p>
            </a>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-heading-xl font-bold text-foreground">{t('learn.adaptive')}</p>
          <p className="mt-1 text-body-lg text-muted-foreground">{t('learn.adaptiveDetail')}</p>
        </div>
      </div>
    </section>
  )
}
