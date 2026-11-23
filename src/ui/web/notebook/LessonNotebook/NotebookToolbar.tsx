'use client'

import {
  CheckCheck,
  ClipboardPaste,
  Copy,
  Eraser,
  FilePlus,
  Hand,
  LassoSelect,
  Pencil,
  Undo2,
} from 'lucide-react'

import { cn } from '@/infra/utils/ui'
import type { NotebookCut } from '@/infra/types/notebook'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { InkTool } from './InkSurface'
import { LatestCutButton } from './LatestCutButton'
import { PEN_SIZES } from './stroke-render'
import { useTouchToolHint } from './useTouchToolHint'
import type { NotebookStatus } from './useNotebookPages'

interface NotebookToolbarProps {
  latestCut: NotebookCut | null
  inks: readonly string[]
  tool: InkTool
  fingerDraws: boolean
  canUndo: boolean
  canCopy: boolean
  canPaste: boolean
  /** There is a page to check (the active one). */
  canCheck: boolean
  status: NotebookStatus
  onTool: (tool: InkTool) => void
  onFingerDraws: (value: boolean) => void
  onUndo: () => void
  onCopy: () => void
  onPaste: () => void
  onBlankPage: () => void
  onCheck: () => void
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-normal disabled:opacity-40 disabled:pointer-events-none'
const ACTIVE = 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
/** Dot sizes for the thin, regular and thick pen buttons. */
const SIZE_DOTS = ['h-1.5 w-1.5', 'h-2.5 w-2.5', 'h-3.5 w-3.5']

export function NotebookToolbar({
  latestCut,
  inks,
  tool,
  fingerDraws,
  canUndo,
  canCopy,
  canPaste,
  canCheck,
  status,
  onTool,
  onFingerDraws,
  onUndo,
  onCopy,
  onPaste,
  onBlankPage,
  onCheck,
}: NotebookToolbarProps) {
  const t = useTranslations('courses.lessonNotebook')
  const { hint, onPointerUp } = useTouchToolHint()
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
    <div
      onPointerUp={onPointerUp}
      className="sticky top-2 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-border bg-card/95 px-2 py-1 shadow-elevation-2 backdrop-blur"
    >
      <LatestCutButton cut={latestCut} />
      {button(
        t('pen'),
        tool.mode === 'pen',
        () => onTool({ ...tool, mode: 'pen' }),
        <Pencil className="h-4 w-4" />,
      )}
      {button(
        tool.eraser === 'stroke' ? t('objectEraser') : t('eraser'),
        tool.mode === 'erase',
        // Tapping the eraser again switches between rubbing out and removing whole strokes.
        () =>
          onTool(
            tool.mode === 'erase'
              ? { ...tool, eraser: tool.eraser === 'area' ? 'stroke' : 'area' }
              : { ...tool, mode: 'erase' },
          ),
        <span className="relative flex">
          <Eraser className="h-4 w-4" />
          {tool.eraser === 'stroke' && (
            <span className="absolute -bottom-1 -end-1 h-2 w-2 rounded-full bg-current" />
          )}
        </span>,
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
            className={cn(ICON_BUTTON, tool.mode === 'pen' && tool.size === index && ACTIVE)}
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
      <button
        type="button"
        aria-label={t('checkPageHint')}
        title={t('checkPageHint')}
        disabled={!canCheck}
        onClick={onCheck}
        className="ms-1 flex h-9 items-center gap-1.5 rounded-full bg-success/10 px-3 text-body-xs font-semibold text-success hover:bg-success/20 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-normal"
      >
        <CheckCheck className="h-4 w-4" />
        {t('checkPage')}
      </button>
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
      {hint && (
        // Screen readers already read the button's aria-label.
        <span
          key={hint.id}
          aria-hidden
          className="pointer-events-none absolute top-full left-1/2 mt-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-1.5 text-center text-body-xs text-popover-foreground shadow-elevation-3 animate-in fade-in-0 zoom-in-95"
        >
          {hint.label}
        </span>
      )}
    </div>
  )
}
