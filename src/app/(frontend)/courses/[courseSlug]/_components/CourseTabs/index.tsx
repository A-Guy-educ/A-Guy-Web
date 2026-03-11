'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

export type CourseTab = 'learn' | 'practice' | 'ask' | 'exams'

export const TAB_COLORS: Record<CourseTab, { text: string; border: string; stroke: string }> = {
  learn: { text: 'text-blue-600', border: 'border-blue-500/40', stroke: '#2563eb' },
  practice: { text: 'text-red-700', border: 'border-red-600/40', stroke: '#b91c1c' },
  exams: { text: 'text-purple-600', border: 'border-purple-500/40', stroke: '#7c3aed' },
  ask: { text: 'text-emerald-600', border: 'border-emerald-500/40', stroke: '#059669' },
}

interface CourseTabsProps {
  activeTab: CourseTab
  onTabChange: (tab: CourseTab) => void
}

const TABS: CourseTab[] = ['learn', 'practice', 'ask', 'exams']

export function CourseTabs({ activeTab, onTabChange }: CourseTabsProps) {
  const t = useTranslations('coursePage.tabs')

  return (
    <div className="py-4">
      <div className="bg-muted/50 p-1 rounded-full flex items-center justify-center gap-0 max-w-md mx-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                'flex-1 px-6 py-2 text-sm rounded-full transition-all',
                isActive
                  ? `bg-card ${TAB_COLORS[tab].text} font-bold shadow-sm`
                  : 'text-muted-foreground hover:text-foreground',
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
