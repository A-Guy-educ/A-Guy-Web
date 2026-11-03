'use client'

import { CheckCheck, Plus, Trash2 } from 'lucide-react'

import { NOTEBOOK_PAGE_WIDTH, type NotebookPage, type NotebookStroke } from '@/infra/types/notebook'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { InkSurface, type InkTool } from './InkSurface'

// Same squared paper as the floating notebook and the Ask drawing canvas.
const GRID_STYLE = {
  backgroundImage:
    'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
}

interface NotebookPageCardProps {
  page: NotebookPage
  pageNumber: number
  active: boolean
  inks: readonly string[]
  tool: InkTool
  fingerDraws: boolean
  onStrokes: (strokes: NotebookStroke[]) => void
  onActivate: () => void
  onExtend: () => void
  onDelete: () => void
  onCheck: () => void
}

export function NotebookPageCard({
  page,
  pageNumber,
  active,
  inks,
  tool,
  fingerDraws,
  onStrokes,
  onActivate,
  onExtend,
  onDelete,
  onCheck,
}: NotebookPageCardProps) {
  const t = useTranslations('courses.lessonNotebook')
  const { cut } = page
  const sourceLabel = cut?.source.page
    ? t('sourceWithPage')
        .replace('{label}', cut.source.label)
        .replace('{page}', String(cut.source.page))
    : (cut?.source.label ?? t('blankPage'))

  return (
    <article
      className={cn(
        'rounded-lg border bg-card shadow-card overflow-hidden transition-colors duration-normal',
        active ? 'border-primary/60' : 'border-border',
      )}
      onPointerDownCapture={onActivate}
    >
      <header className="flex items-center gap-content-gap-xs px-4 py-2 border-b border-border/60 bg-muted/40 text-body-xs">
        <strong className="text-foreground">
          {t('pageTitle').replace('{number}', String(pageNumber))}
        </strong>
        <span className="truncate text-muted-foreground">{sourceLabel}</span>
        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onCheck}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors duration-normal"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('checkPage')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('deletePage')}
            title={t('deletePage')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-normal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div
        className="relative w-full bg-background"
        style={{ ...GRID_STYLE, aspectRatio: `${NOTEBOOK_PAGE_WIDTH} / ${page.height}` }}
      >
        {cut && (
          // eslint-disable-next-line @next/next/no-img-element -- blob-hosted user cut; sized by the page, not by next/image
          <img
            src={cut.url}
            alt={t('cutAlt')}
            width={cut.width}
            height={cut.height}
            draggable={false}
            className="absolute inset-x-0 top-0 w-full h-auto select-none bg-background"
          />
        )}
        <InkSurface
          height={page.height}
          strokes={page.strokes}
          inks={inks}
          tool={tool}
          fingerDraws={fingerDraws}
          onStrokeEnd={(stroke) => onStrokes([...page.strokes, stroke])}
          className={tool.erase ? 'cursor-cell' : 'cursor-crosshair'}
        />
      </div>

      <footer className="flex justify-center border-t border-border/60 bg-muted/40 py-1.5">
        <button
          type="button"
          onClick={onExtend}
          className="flex items-center gap-1 px-3 py-1 rounded-md text-body-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-normal"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addSpace')}
        </button>
      </footer>
    </article>
  )
}
