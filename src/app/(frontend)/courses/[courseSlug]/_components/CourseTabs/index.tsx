'use client'

import { useTranslations } from '@/ui/web/providers/I18n'

export type CourseTab = 'learn' | 'practice' | 'ask' | 'exams'

/** Per-type accents, still used by the stats and study pages. */
export const TAB_COLORS: Record<CourseTab, { text: string; stroke: string }> = {
  learn: { text: 'hsl(var(--tab-learn))', stroke: 'hsl(var(--tab-learn))' },
  practice: { text: 'hsl(var(--tab-practice))', stroke: 'hsl(var(--tab-practice))' },
  exams: { text: 'hsl(var(--tab-exams))', stroke: 'hsl(var(--tab-exams))' },
  ask: { text: 'hsl(var(--tab-ask))', stroke: 'hsl(var(--tab-ask))' },
}

/** The course page's content types, in the demo's order (Ask lives in /ask). */
export const CONTENT_TABS = ['learn', 'practice', 'exams'] as const
export type ContentTab = (typeof CONTENT_TABS)[number]

interface CourseTabsProps {
  activeTab: ContentTab
  onTabChange: (tab: ContentTab) => void
}

/** The demo's "כל התוכן" pills: למידה / תרגול / בחינות. */
export function CourseTabs({ activeTab, onTabChange }: CourseTabsProps) {
  const t = useTranslations('coursePage.tabs')
  const tHub = useTranslations('coursePage.hub')

  return (
    <div className="content-tabs" role="group" aria-label={tHub('contentTabsLabel')}>
      {CONTENT_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={activeTab === tab ? 'pill selected' : 'pill'}
          aria-pressed={activeTab === tab}
          onClick={() => onTabChange(tab)}
        >
          {t(tab)}
        </button>
      ))}
    </div>
  )
}
