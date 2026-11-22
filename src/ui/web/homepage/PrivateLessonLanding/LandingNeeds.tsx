import type { ReactNode } from 'react'

import { SectionHeading, START_PAGE_HREF, type Translate } from './landingShared'

const INTENTS: Array<{ key: string; icon: ReactNode }> = [
  {
    key: 'homework',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M8 6l2-3h4l2 3h4v14H4V6z" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    key: 'fromScratch',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 6Q7 2 3 5v15q4-3 9 0 5-3 9 0V5q-4-3-9 1zm0 0v14" />
      </svg>
    ),
  },
  {
    key: 'practice',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="m4 16 12-12 4 4L8 20H4zm10-10 4 4" />
      </svg>
    ),
  },
  {
    key: 'exam',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M8 4H4v17h16V4h-4M8 3h8v4H8zm0 11 3 3 5-6" />
      </svg>
    ),
  },
]

/** "מה לומדים עם המורה?" — the four ways in, and the 16-student-types note. */
export function LandingNeeds({ t }: { t: Translate }) {
  return (
    <section className="needs wrap" id="start-learning">
      <SectionHeading title={t('learn.title')} description={t('learn.description')} />
      <div className="intent-grid">
        {INTENTS.map(({ key, icon }) => (
          <a key={key} className="intent" href={START_PAGE_HREF}>
            <span className="intent-icon" aria-hidden="true">
              {icon}
            </span>
            <h3>{t(`learn.items.${key}.title`)}</h3>
            <p>{t(`learn.items.${key}.description`)}</p>
          </a>
        ))}
      </div>
      <div className="personal-note">
        <strong>{t('learn.adaptive')}</strong>
        <p>{t('learn.adaptiveDetail')}</p>
      </div>
    </section>
  )
}
