/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-filter
 * @ai-summary The demo's two filter pills above the chapters: all lessons, or only the ones the student started. Purely presentational — parent owns the state.
 */

'use client'

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
    <div className="lesson-filters" role="group" aria-label={t('roadmapFilterGroupLabel')}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="pill"
          onClick={() => onChange(chip.key)}
          aria-pressed={chip.key === mode}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
