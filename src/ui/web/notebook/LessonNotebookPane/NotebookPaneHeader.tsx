'use client'

import { FileText, NotebookPen, Scissors } from 'lucide-react'
import React from 'react'

import { cn } from '@/infra/utils/ui'
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
}

const TAB =
  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-xs transition-colors duration-normal'

/**
 * Material | Notebook switch, centred so the lesson menu's floating back/menu
 * pills (pinned to the start corner) never cover it. On touch devices a
 * scissors toggle turns finger cutting on; its label doubles as the hint.
 */
export function NotebookPaneHeader({
  view,
  onView,
  pageCount,
  cuttable,
  touchDevice,
  touchCut,
  onTouchCut,
}: NotebookPaneHeaderProps) {
  const t = useTranslations('courses.lessonNotebook')
  const showCutControls = view === 'material' && cuttable

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
    </div>
  )
}
