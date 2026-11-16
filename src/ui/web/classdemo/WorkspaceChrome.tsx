import type { Dispatch, ReactNode } from 'react'

import { LESSON_FILTERS } from './classDemoLessons'
import type { LessonFilter } from './classDemoLessons'
import { chip, eyebrow } from './classDemoStyles'
import type { ClassDemoAction, DemoTab } from './classDemoState'

interface WorkspaceBarProps {
  label: string
  name: string
  subtitle: string
  classChip: ReactNode
  actions?: ReactNode
}

export function WorkspaceBar({ label, name, subtitle, classChip, actions }: WorkspaceBarProps) {
  return (
    <div className="mb-5 flex flex-col items-start justify-between gap-3.5 sm:flex-row">
      <div>
        <span className={eyebrow}>{label}</span>
        <h2 className="mt-1 mb-1 font-nc-display text-[23px] font-extrabold tracking-[-.6px] sm:text-[29px]">
          שלום, {name} 👋
        </h2>
        <p className="m-0 text-[13px] text-nc-ink-2">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-content-gap-xs">
        <span className={chip}>{classChip}</span>
        {actions}
      </div>
    </div>
  )
}

interface WorkspaceTabsProps {
  tab: DemoTab
  dashboardLabel: string
  dispatch: Dispatch<ClassDemoAction>
}

export function WorkspaceTabs({ tab, dashboardLabel, dispatch }: WorkspaceTabsProps) {
  const tabs: { value: DemoTab; label: string }[] = [
    { value: 'dashboard', label: dashboardLabel },
    { value: 'content', label: 'תוכן השיעורים' },
  ]
  return (
    <div className="mb-6 flex gap-5 border-b border-nc-line sm:gap-content-gap-lg" role="tablist">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={tab === value}
          onClick={() => dispatch({ type: 'setTab', tab: value })}
          className={`-mb-px cursor-pointer border-b-[3px] px-1 pt-2.5 pb-3.5 text-body-sm font-bold ${tab === value ? 'border-nc-brand text-nc-brand' : 'border-transparent text-nc-ink-soft'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

interface LessonFiltersProps {
  current: LessonFilter
  dispatch: Dispatch<ClassDemoAction>
}

export function LessonFilters({ current, dispatch }: LessonFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LESSON_FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          onClick={() => dispatch({ type: 'setFilter', filter: value })}
          className={`cursor-pointer rounded-[9px] px-3.5 py-2 text-body-xs font-bold ${current === value ? 'bg-nc-brand-tint text-nc-brand-deep' : 'text-nc-ink-soft'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-section-lg text-center text-[13px] text-nc-ink-soft">{children}</div>
  )
}
