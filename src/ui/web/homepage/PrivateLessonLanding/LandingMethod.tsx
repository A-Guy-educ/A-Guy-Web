import { Lightbulb, Pencil, Trophy, type LucideIcon } from 'lucide-react'

import { SectionHeading, type Translate } from './landingShared'

const STEPS: Array<{ key: 'try' | 'hint' | 'solve'; icon: LucideIcon }> = [
  { key: 'try', icon: Pencil },
  { key: 'hint', icon: Lightbulb },
  { key: 'solve', icon: Trophy },
]

/** The objection ("my child won't learn like this") and how a lesson answers it. */
export function LandingMethod({ t }: { t: Translate }) {
  return (
    <section id="example" className="bg-muted/30 px-4 py-section-xl">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-display-sm font-extrabold text-foreground">{t('objection.quote')}</p>
        <p className="mt-3 text-heading-md text-muted-foreground">{t('objection.heard')}</p>
        <p className="mt-6 text-heading-lg font-semibold text-foreground">
          {t('objection.answer')}
        </p>
        <p className="mt-2 text-body-lg text-muted-foreground">{t('objection.how')}</p>
      </div>

      <div className="mx-auto mt-section-md max-w-6xl">
        <SectionHeading title={t('method.title')} description={t('method.description')} />
        <ol className="grid gap-content-gap-lg md:grid-cols-3">
          {STEPS.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              className="rounded-2xl border border-border bg-card p-card-padding shadow-elevation-1"
            >
              <div className="flex items-center gap-content-gap-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-body-sm font-semibold text-muted-foreground">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-heading-xl font-bold text-foreground">
                {t(`method.steps.${key}.title`)}
              </h3>
              <p className="mt-2 text-body-md text-muted-foreground">
                {t(`method.steps.${key}.description`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
