'use client'

import { FileText, NotebookPen, Scissors } from 'lucide-react'
import React from 'react'

import { cn } from '@/infra/utils/ui'
import { LessonViewerBar } from '@/ui/web/lesson-menu'
import { useTranslations } from '@/ui/web/providers/I18n'

export type PaneView = 'material' | 'notebook'

interface NotebookPaneHeaderProps {
  view: PaneView
  onView: (view: PaneView) => void
  pageCount: number
  /** The material can be cut from (shows the hint or the touch cut button). */
  cuttable: boolean
  /** The device has a touchscreen, so a finger needs an explicit cut mode. */
  touchDevice: boolean
  touchCut: boolean
  onTouchCut: (on: boolean) => void
  /**
   * Controls rendered before the switch (the inline lesson menu). When set,
   * the header becomes the compact desktop bar with icon-only switches.
   */
  leading?: React.ReactNode
}

const TAB =
  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-xs transition-colors duration-normal'

const ICON_TAB =
  'relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-normal'

/**
 * Material | Notebook switch. Without `leading` it is centred so the lesson
 * menu's floating back/menu pills (pinned to the start corner) never cover
 * it; with `leading` it sits in one bar right after the menu. On touch
 * devices a scissors toggle turns finger cutting on; its label doubles as the hint.
 */
export function NotebookPaneHeader({
  view,
  onView,
  pageCount,
  cuttable,
  touchDevice,
  touchCut,
  onTouchCut,
  leading,
}: NotebookPaneHeaderProps) {
  const t = useTranslations('courses.lessonNotebook')
  const showCutControls = view === 'material' && cuttable

  const cutControls = (
    <>
      {showCutControls && touchDevice && (
        <button
          type="button"
          onClick={() => onTouchCut(!touchCut)}
          aria-pressed={touchCut}
          className={cn(
            TAB,
            touchCut
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Scissors className="h-3.5 w-3.5" />
          {touchCut ? t('touchCutOn') : t('touchCut')}
        </button>
      )}
      {showCutControls && !touchDevice && (
        <span className="hidden ps-2 text-body-xs text-muted-foreground md:inline">
          {t('cutHint')}
        </span>
      )}
    </>
  )

  if (leading) {
    const iconTab = (target: PaneView, icon: React.ReactNode, label: string) => (
      <button
        type="button"
        onClick={() => onView(target)}
        aria-pressed={view === target}
        aria-label={label}
        title={label}
        className={cn(
          ICON_TAB,
          view === target
            ? 'border-border bg-muted text-foreground'
            : 'border-transparent text-muted-foreground hover:bg-primary/5 hover:text-primary',
        )}
      >
        {icon}
      </button>
    )
    return (
      <LessonViewerBar>
        {leading}
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        {iconTab('material', <FileText className="h-[18px] w-[18px]" />, t('materialTab'))}
        {iconTab(
          'notebook',
          <>
            <NotebookPen className="h-[18px] w-[18px]" />
            {pageCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-body-2xs font-semibold leading-none text-primary-foreground">
                {pageCount}
              </span>
            )}
          </>,
          t('notebookTab'),
        )}
        <div className="ms-auto flex items-center">{cutControls}</div>
      </LessonViewerBar>
    )
  }

  const tab = (target: PaneView, icon: React.ReactNode, label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onView(target)}
      aria-pressed={view === target}
      className={cn(
        TAB,
        view === target
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-1 border-b border-border/60 bg-card/80 px-3 py-1.5">
      {tab('material', <FileText className="h-3.5 w-3.5" />, t('materialTab'))}
      {tab(
        'notebook',
        <NotebookPen className="h-3.5 w-3.5" />,
        <>
          {t('notebookTab')}
          {pageCount > 0 && <span className="text-muted-foreground">({pageCount})</span>}
        </>,
      )}
      {cutControls}
    </div>
  )
}
