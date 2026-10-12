/**
 * MathPicker — unified "+" menu for inserting math atoms and (optionally)
 * attaching an image or opening a drawing notebook.
 *
 * Four view kinds:
 *   root     — the top-level menu (Points / Math / Functions / Geometry +
 *              optional Image + optional Notebook entries)
 *   category — palette of basic tools, with a secondary "+" for advanced
 *   tool     — Hebrew-labelled fields, live KaTeX preview, Insert button
 *   point    — multi-row coordinate editor (name / x / y per row)
 *
 * Image + Notebook entries are gated on the `onImageUpload` / `onNotebook`
 * props so chat (image only) and open-answer (notebook only) each get the
 * right subset without a parallel component tree.
 *
 * On Insert the composed LaTeX is handed to `onInsert(latex)` which the
 * caller forwards to the TipTap-chip insert API.
 */

'use client'

import React, { useMemo, useState } from 'react'
import katex from 'katex'
import { cn } from '@/infra/utils/ui'
import { ArrowRight, Image as ImageIcon, NotebookPen, Plus, X } from 'lucide-react'
import { MATH_CATEGORIES, MATH_TOOLS, type MathTool, type ToolCategory } from './mathTools'

export interface MathPickerProps {
  onInsert: (latex: string) => void
  onClose?: () => void
  /** Shows an Image entry in the root menu when provided; clicking it fires
   *  this callback (the caller handles the file picker). */
  onImageUpload?: () => void
  /** Shows a Notebook entry in the root menu when provided; clicking it fires
   *  this callback (the caller reveals the drawing notebook UI). */
  onNotebook?: () => void
  className?: string
}

type View =
  | { kind: 'root' }
  | { kind: 'category'; category: ToolCategory; expanded: boolean }
  | { kind: 'tool'; tool: MathTool }
  | { kind: 'point' }

export function MathPicker({
  onInsert,
  onClose,
  onImageUpload,
  onNotebook,
  className,
}: MathPickerProps) {
  const [view, setView] = useState<View>({ kind: 'root' })

  const insertAndReset = (latex: string) => {
    onInsert(latex)
    setView({ kind: 'root' })
  }

  return (
    <div
      dir="rtl"
      className={cn('flex flex-col gap-content-gap-xs min-w-[260px] max-w-[320px]', className)}
    >
      <Header view={view} onBack={() => setView(backFor(view))} onClose={onClose} />

      {view.kind === 'root' && (
        <RootView
          onPickCategory={(cat) => setView({ kind: 'category', category: cat, expanded: false })}
          onPickPoint={() => setView({ kind: 'point' })}
          onImageUpload={onImageUpload}
          onNotebook={onNotebook}
          onClose={onClose}
        />
      )}

      {view.kind === 'category' && (
        <CategoryView
          category={view.category}
          expanded={view.expanded}
          onExpand={() => setView({ ...view, expanded: true })}
          onPickTool={(tool) => setView({ kind: 'tool', tool })}
        />
      )}

      {view.kind === 'tool' && <ToolEditor tool={view.tool} onInsert={insertAndReset} />}

      {view.kind === 'point' && <PointEditor onInsert={insertAndReset} />}
    </div>
  )
}

function backFor(view: View): View {
  if (view.kind === 'tool') {
    const cat = MATH_CATEGORIES.find(
      (c) => c.basic.includes(view.tool.key) || c.advanced.includes(view.tool.key),
    )
    return cat
      ? { kind: 'category', category: cat.category, expanded: cat.advanced.includes(view.tool.key) }
      : { kind: 'root' }
  }
  if (view.kind === 'category' || view.kind === 'point') return { kind: 'root' }
  return view
}

function Header({
  view,
  onBack,
  onClose,
}: {
  view: View
  onBack: () => void
  onClose?: () => void
}) {
  // Root view is intentionally un-titled — the menu entries are self-evident
  // and the demo mock renders the menu with no header strap.
  if (view.kind === 'root') {
    if (!onClose) return null
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }
  const title =
    view.kind === 'tool'
      ? view.tool.label
      : view.kind === 'point'
        ? 'נקודה / נקודות'
        : (MATH_CATEGORIES.find((c) => c.category === view.category)?.title ?? '')
  return (
    <div className="flex items-center gap-content-gap-xs pb-1 border-b border-border">
      <button
        type="button"
        onClick={onBack}
        aria-label="חזרה"
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      <span className="flex-1 text-body-sm font-semibold text-foreground truncate">{title}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function RootView({
  onPickCategory,
  onPickPoint,
  onImageUpload,
  onNotebook,
  onClose,
}: {
  onPickCategory: (c: ToolCategory) => void
  onPickPoint: () => void
  onImageUpload?: () => void
  onNotebook?: () => void
  onClose?: () => void
}) {
  const entries: Array<{
    key: string
    label: string
    onClick: () => void
    symbol?: React.ReactNode
  }> = [
    { key: 'point', label: 'נקודה / נקודות', symbol: '(x,y)', onClick: onPickPoint },
    ...MATH_CATEGORIES.map((c) => ({
      key: c.category,
      label: c.title,
      symbol: c.category === 'math' ? 'a/b' : c.category === 'functions' ? 'sin' : '△',
      onClick: () => onPickCategory(c.category),
    })),
  ]
  if (onImageUpload) {
    entries.push({
      key: 'image',
      label: 'תמונה',
      symbol: <ImageIcon className="w-4 h-4" />,
      onClick: () => {
        onImageUpload()
        onClose?.()
      },
    })
  }
  if (onNotebook) {
    entries.push({
      key: 'notebook',
      label: 'מחברת',
      symbol: <NotebookPen className="w-4 h-4" />,
      onClick: () => {
        onNotebook()
        onClose?.()
      },
    })
  }
  return (
    <div className="flex flex-col gap-content-gap-xs">
      {entries.map((e) => (
        <button
          key={e.key}
          type="button"
          onClick={e.onClick}
          className="flex items-center gap-content-gap-xs px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-body-md text-foreground text-start"
        >
          <span className="w-10 flex items-center justify-center text-muted-foreground">
            {e.symbol}
          </span>
          <span className="flex-1">{e.label}</span>
        </button>
      ))}
    </div>
  )
}

function CategoryView({
  category,
  expanded,
  onExpand,
  onPickTool,
}: {
  category: ToolCategory
  expanded: boolean
  onExpand: () => void
  onPickTool: (t: MathTool) => void
}) {
  const layout = MATH_CATEGORIES.find((c) => c.category === category)
  if (!layout) return null
  const basic = layout.basic.map((k) => MATH_TOOLS[k]).filter((t): t is MathTool => !!t)
  const advanced = layout.advanced.map((k) => MATH_TOOLS[k]).filter((t): t is MathTool => !!t)
  return (
    <div className="flex flex-col gap-content-gap-xs">
      <div className="flex flex-wrap gap-1">
        {basic.map((t) => (
          <ToolButton key={t.key} tool={t} onPick={onPickTool} />
        ))}
        {!expanded && advanced.length > 0 && (
          <button
            type="button"
            onClick={onExpand}
            aria-label="כלים מתקדמים"
            className="shrink-0 min-w-[44px] h-10 px-2.5 rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-body-md"
          >
            <Plus className="w-4 h-4 inline" />
          </button>
        )}
      </div>
      {expanded && advanced.length > 0 && (
        <>
          <span className="text-body-xs text-muted-foreground mt-1">מתקדם</span>
          <div className="flex flex-wrap gap-1">
            {advanced.map((t) => (
              <ToolButton key={t.key} tool={t} onPick={onPickTool} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ToolButton({ tool, onPick }: { tool: MathTool; onPick: (t: MathTool) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(tool)}
      aria-label={tool.label}
      title={tool.label}
      className="shrink-0 min-w-[44px] h-10 px-2.5 rounded-md border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-body-md"
    >
      {tool.symbol}
    </button>
  )
}

function ToolEditor({ tool, onInsert }: { tool: MathTool; onInsert: (latex: string) => void }) {
  const [values, setValues] = useState<string[]>(() => tool.fields.map((f) => f.defaultValue ?? ''))

  const previewLatex = useMemo(() => tool.build(values), [tool, values])
  const previewHtml = useMemo(() => renderKatex(previewLatex), [previewLatex])

  const canInsert = tool.fields.every((f, i) => f.optional || (values[i] ?? '').trim().length > 0)

  if (tool.fields.length === 0) {
    return (
      <div className="flex flex-col gap-content-gap-xs">
        <PreviewBox html={previewHtml} />
        <InsertButton onClick={() => onInsert(previewLatex)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-content-gap-xs">
      <div className="flex flex-col gap-1.5">
        {tool.fields.map((f, i) => (
          <label key={i} className="flex flex-col gap-0.5 text-body-xs text-muted-foreground">
            <span>{f.label}</span>
            <input
              type="text"
              dir="ltr"
              autoComplete="off"
              value={values[i] ?? ''}
              onChange={(e) =>
                setValues((prev) => {
                  const next = [...prev]
                  next[i] = e.target.value
                  return next
                })
              }
              className="rounded-md border border-input bg-background px-2 py-1.5 text-body-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </label>
        ))}
      </div>

      <PreviewBox html={previewHtml} />
      <InsertButton onClick={() => onInsert(previewLatex)} disabled={!canInsert} />
    </div>
  )
}

interface PointRow {
  name: string
  x: string
  y: string
}

function PointEditor({ onInsert }: { onInsert: (latex: string) => void }) {
  const [rows, setRows] = useState<PointRow[]>([{ name: 'A', x: '', y: '' }])

  const previewLatex = useMemo(() => buildPointsLatex(rows), [rows])
  const previewHtml = useMemo(() => renderKatex(previewLatex), [previewLatex])
  const canInsert = rows.every((r) => r.name.trim() && r.x.trim() && r.y.trim())

  const addRow = () => {
    const nextLetter = String.fromCharCode(65 + rows.length) // A, B, C, ...
    setRows((prev) => [...prev, { name: nextLetter, x: '', y: '' }])
  }

  const updateRow = (i: number, field: keyof PointRow, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      next[i] = { ...next[i]!, [field]: value }
      return next
    })
  }

  const removeRow = (i: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  return (
    <div className="flex flex-col gap-content-gap-xs">
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-1">
            {(['name', 'x', 'y'] as const).map((field) => (
              <label
                key={field}
                className="flex-1 flex flex-col gap-0.5 text-body-xs text-muted-foreground"
              >
                <span>{field === 'name' ? 'שם' : field}</span>
                <input
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  value={row[field]}
                  onChange={(e) => updateRow(i, field, e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-body-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </label>
            ))}
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="הסר נקודה"
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-body-xs text-primary hover:underline self-start"
      >
        + נקודה נוספת
      </button>

      <PreviewBox html={previewHtml} />
      <InsertButton onClick={() => onInsert(previewLatex)} disabled={!canInsert} />
    </div>
  )
}

function buildPointsLatex(rows: PointRow[]): string {
  if (rows.length === 0) return ''
  return rows
    .map((r) => {
      const name = r.name.trim() || '\\placeholder{}'
      const x = r.x.trim() || '\\placeholder{}'
      const y = r.y.trim() || '\\placeholder{}'
      return `${name}\\left(${x}, ${y}\\right)`
    })
    .join('\\quad ')
}

function renderKatex(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      output: 'html',
      macros: { '\\placeholder': '\\square' },
    })
  } catch {
    return '<span class="text-destructive text-body-xs">תצוגה מקדימה נכשלה</span>'
  }
}

function PreviewBox({ html }: { html: string }) {
  return (
    <div
      dir="ltr"
      className="rounded-md border border-border bg-muted/40 px-3 py-3 min-h-[48px] flex items-center justify-center"
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function InsertButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-md text-body-sm font-semibold transition-colors',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      הוסף להודעה
    </button>
  )
}
