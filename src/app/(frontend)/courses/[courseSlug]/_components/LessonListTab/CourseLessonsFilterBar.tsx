/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-filter
 * @ai-summary Single toggle button above the chapter accordions. Flips between `all` (show every lesson) and `uncompleted` (hide completed lessons). Purely presentational — parent owns the state.
 */

'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { FilterMode } from './lessonRoadmapTypes'

interface CourseLessonsFilterBarProps {
  mode: FilterMode
  onChange: (mode: FilterMode) => void
}

interface Chip {
  key: FilterMode
  label: string
}

export function CourseLessonsFilterBar({ mode, onChange }: CourseLessonsFilterBarProps) {
  const t = useTranslations('coursePage')
  const chips: Chip[] = [
    { key: 'all', label: t('roadmapFilterAll') },
    { key: 'started', label: t('roadmapFilterStarted') },
  ]

  return (
    <div
      className="flex flex-wrap justify-end gap-content-gap-xs mb-content-gap px-2"
      role="group"
      aria-label={t('roadmapFilterGroupLabel')}
    >
      {chips.map((chip) => {
        const isActive = chip.key === mode
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.key)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center rounded-xl border px-3.5 py-1.5',
              'text-body-xs font-semibold transition-all duration-normal',
              isActive
                ? 'bg-primary/10 text-primary border-primary/40 shadow-elevation-1'
                : 'bg-card text-muted-foreground border-border hover:text-foreground',
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
