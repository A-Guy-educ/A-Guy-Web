'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

export type CourseTab = 'learn' | 'practice' | 'ask' | 'exams'

interface CourseTabsProps {
  activeTab: CourseTab
  onTabChange: (tab: CourseTab) => void
}

const TABS: CourseTab[] = ['learn', 'practice', 'ask', 'exams']

export function CourseTabs({ activeTab, onTabChange }: CourseTabsProps) {
  const t = useTranslations('coursePage.tabs')

  return (
    <div className="py-4">
      <div className="max-w-lg mx-auto px-4 flex items-center justify-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                'px-6 py-2 text-sm rounded-full transition-all border',
                isActive
                  ? 'border-border bg-card text-primary font-bold shadow-sm'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(tab)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
