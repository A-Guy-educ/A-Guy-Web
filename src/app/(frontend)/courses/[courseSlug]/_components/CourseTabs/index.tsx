'use client'

import { cn } from '@/infra/utils/ui'
import { motion } from 'framer-motion'
import { useTranslations } from '@/ui/web/providers/I18n'

export type CourseTab = 'learn' | 'practice' | 'ask' | 'exams'

export const TAB_COLORS: Record<CourseTab, { text: string; stroke: string }> = {
  learn: { text: 'hsl(var(--tab-learn))', stroke: 'hsl(var(--tab-learn))' },
  practice: { text: 'hsl(var(--tab-practice))', stroke: 'hsl(var(--tab-practice))' },
  exams: { text: 'hsl(var(--tab-exams))', stroke: 'hsl(var(--tab-exams))' },
  ask: { text: 'hsl(var(--tab-ask))', stroke: 'hsl(var(--tab-ask))' },
}

interface CourseTabsProps {
  activeTab: CourseTab
  onTabChange: (tab: CourseTab) => void
}

const TABS: CourseTab[] = ['learn', 'practice', 'exams', 'ask']

export function CourseTabs({ activeTab, onTabChange }: CourseTabsProps) {
  const t = useTranslations('coursePage.tabs')

  return (
    <div className="py-content-gap">
      <div
        role="tablist"
        className="flex flex-wrap items-center justify-center gap-content-gap-xs max-w-xl mx-auto"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          const color = TAB_COLORS[tab]

          return (
            <motion.button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab)}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'rounded-full border px-4 py-2 min-h-[36px] text-body-sm font-semibold transition-all duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-muted/60 shadow-elevation-1'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground',
              )}
              style={isActive ? { color: color.text, borderColor: color.stroke } : undefined}
            >
              {t(tab)}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
