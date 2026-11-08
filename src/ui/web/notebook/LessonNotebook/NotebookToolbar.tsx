'use client'

import {
  ClipboardPaste,
  Copy,
  Eraser,
  FilePlus,
  Hand,
  LassoSelect,
  Pencil,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { InkTool } from './InkSurface'
import { PEN_SIZES } from './stroke-render'
import type { NotebookStatus } from './useNotebookPages'

interface NotebookToolbarProps {
  inks: readonly string[]
  tool: InkTool
  fingerDraws: boolean
  canUndo: boolean
  canCopy: boolean
  canPaste: boolean
  zoom: number
  canZoomIn: boolean
  canZoomOut: boolean
  status: NotebookStatus
  onTool: (tool: InkTool) => void
  onFingerDraws: (value: boolean) => void
  onUndo: () => void
  onCopy: () => void
  onPaste: () => void
  onZoom: (direction: 1 | -1) => void
  onBlankPage: () => void
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-normal disabled:opacity-40 disabled:pointer-events-none'
const ACTIVE = 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
/** Dot sizes for the thin, regular and thick pen buttons. */
const SIZE_DOTS = ['h-1 w-1', 'h-2 w-2', 'h-3 w-3']

export function NotebookToolbar({
  inks,
  tool,
  fingerDraws,
  canUndo,
  canCopy,
  canPaste,
  zoom,
  canZoomIn,
  canZoomOut,
  status,
  onTool,
  onFingerDraws,
  onUndo,
  onCopy,
  onPaste,
  onZoom,
  onBlankPage,
}: NotebookToolbarProps) {
  const t = useTranslations('courses.lessonNotebook')
  const statusLabel = {
    loading: '',
    synced: t('saved'),
    saving: t('saving'),
    savedLocally: t('savedLocally'),
    unsaved: t('notSavedYet'),
  }[status]

  const actionButton = (
    label: string,
    disabled: boolean,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={ICON_BUTTON}
    >
      {icon}
    </button>
  )

  const button = (label: string, active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(ICON_BUTTON, active && ACTIVE)}
    >
      {icon}
    </button>
  )

  return (
    <div className="sticky top-2 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-border bg-card/95 px-2 py-1 shadow-elevation-2 backdrop-blur">
      {button(
        t('pen'),
        tool.mode === 'pen',
        () => onTool({ ...tool, mode: 'pen' }),
        <Pencil className="h-4 w-4" />,
      )}
      {button(
        t('eraser'),
        tool.mode === 'erase',
        () => onTool({ ...tool, mode: 'erase' }),
        <Eraser className="h-4 w-4" />,
      )}
      {button(
        t('lasso'),
        tool.mode === 'lasso',
        () => onTool({ ...tool, mode: 'lasso' }),
        <LassoSelect className="h-4 w-4" />,
      )}
      <div className="mx-1 flex items-center gap-1.5" dir="ltr">
        {inks.map((ink, index) => (
          <button
            key={index}
            type="button"
            aria-label={t(`ink${index}`)}
            title={t(`ink${index}`)}
            aria-pressed={tool.mode === 'pen' && tool.ink === index}
            onClick={() => onTool({ ...tool, ink: index, mode: 'pen' })}
            className={cn(
              'h-5 w-5 rounded-full border-2 transition-transform duration-normal',
              tool.mode === 'pen' && tool.ink === index
                ? 'border-foreground scale-110'
                : 'border-transparent',
            )}
            style={{ backgroundColor: ink }}
          />
        ))}
      </div>
      <div className="flex items-center" dir="ltr">
        {PEN_SIZES.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={t(`size${index}`)}
            title={t(`size${index}`)}
            aria-pressed={tool.mode === 'pen' && tool.size === index}
            onClick={() => onTool({ ...tool, size: index, mode: 'pen' })}
            className={cn(
              'flex h-9 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-normal',
              tool.mode === 'pen' && tool.size === index && 'text-primary hover:text-primary',
            )}
          >
            <span className={cn('rounded-full bg-current', SIZE_DOTS[index])} />
          </button>
        ))}
      </div>
      {actionButton(t('undo'), !canUndo, onUndo, <Undo2 className="h-4 w-4" />)}
      {tool.mode === 'lasso' && (
        <>
          {actionButton(t('copySelection'), !canCopy, onCopy, <Copy className="h-4 w-4" />)}
          {actionButton(t('paste'), !canPaste, onPaste, <ClipboardPaste className="h-4 w-4" />)}
        </>
      )}
      {button(
        t('fingerDraws'),
        fingerDraws,
        () => onFingerDraws(!fingerDraws),
        <Hand className="h-4 w-4" />,
      )}
      {button(t('newBlankPage'), false, onBlankPage, <FilePlus className="h-4 w-4" />)}
      <div className="flex items-center" dir="ltr">
        {actionButton(t('zoomOut'), !canZoomOut, () => onZoom(-1), <ZoomOut className="h-4 w-4" />)}
        <span className="w-10 text-center text-body-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        {actionButton(t('zoomIn'), !canZoomIn, () => onZoom(1), <ZoomIn className="h-4 w-4" />)}
      </div>
      {statusLabel && (
        <span
          role="status"
          className={cn(
            'px-2 text-body-xs',
            status === 'unsaved' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {statusLabel}
        </span>
      )}
    </div>
  )
}
