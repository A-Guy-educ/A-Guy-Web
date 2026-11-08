'use client'

import { Eraser, FilePlus, Hand, Pencil, Undo2 } from 'lucide-react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { InkTool } from './InkSurface'
import type { NotebookStatus } from './useNotebookPages'

interface NotebookToolbarProps {
  inks: readonly string[]
  tool: InkTool
  fingerDraws: boolean
  canUndo: boolean
  status: NotebookStatus
  onTool: (tool: InkTool) => void
  onFingerDraws: (value: boolean) => void
  onUndo: () => void
  onBlankPage: () => void
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-normal disabled:opacity-40 disabled:pointer-events-none'
const ACTIVE = 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'

export function NotebookToolbar({
  inks,
  tool,
  fingerDraws,
  canUndo,
  status,
  onTool,
  onFingerDraws,
  onUndo,
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
    <div className="sticky top-2 z-20 mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1 shadow-elevation-2 backdrop-blur">
      {button(
        t('pen'),
        !tool.erase,
        () => onTool({ ...tool, erase: false }),
        <Pencil className="h-4 w-4" />,
      )}
      {button(
        t('eraser'),
        tool.erase,
        () => onTool({ ...tool, erase: true }),
        <Eraser className="h-4 w-4" />,
      )}
      <div className="mx-1 flex items-center gap-1.5" dir="ltr">
        {inks.map((ink, index) => (
          <button
            key={index}
            type="button"
            aria-label={t(`ink${index}`)}
            title={t(`ink${index}`)}
            aria-pressed={!tool.erase && tool.ink === index}
            onClick={() => onTool({ ink: index, erase: false })}
            className={cn(
              'h-5 w-5 rounded-full border-2 transition-transform duration-normal',
              !tool.erase && tool.ink === index
                ? 'border-foreground scale-110'
                : 'border-transparent',
            )}
            style={{ backgroundColor: ink }}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label={t('undo')}
        title={t('undo')}
        disabled={!canUndo}
        onClick={onUndo}
        className={ICON_BUTTON}
      >
        <Undo2 className="h-4 w-4" />
      </button>
      {button(
        t('fingerDraws'),
        fingerDraws,
        () => onFingerDraws(!fingerDraws),
        <Hand className="h-4 w-4" />,
      )}
      {button(t('newBlankPage'), false, onBlankPage, <FilePlus className="h-4 w-4" />)}
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
