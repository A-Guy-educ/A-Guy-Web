/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-filter
 * @ai-summary Single toggle button above the chapter accordions. Flips between `all` (show every lesson) and `uncompleted` (hide completed lessons). Purely presentational — parent owns the state.
 */

'use client'

import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { FilterMode } from './lessonRoadmapTypes'

interface CourseLessonsFilterBarProps {
  mode: FilterMode
  onChange: (mode: FilterMode) => void
}

export function CourseLessonsFilterBar({ mode, onChange }: CourseLessonsFilterBarProps) {
  const t = useTranslations('coursePage')
  const isHiding = mode === 'uncompleted'
  const label = isHiding ? t('roadmapFilterShowCompleted') : t('roadmapFilterHideCompleted')
  const Icon = isHiding ? Eye : EyeOff

  return (
    <div className="flex justify-end mb-content-gap px-2">
      <button
        type="button"
        onClick={() => onChange(isHiding ? 'all' : 'uncompleted')}
        aria-pressed={isHiding}
        className={cn(
          'inline-flex items-center gap-content-gap-xs rounded-xl border px-3.5 py-1.5',
          'text-body-xs font-semibold transition-all duration-normal',
          isHiding
            ? 'bg-card text-foreground border-border shadow-elevation-1'
            : 'bg-muted text-muted-foreground border-border hover:text-foreground',
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
    </div>
  )
}
