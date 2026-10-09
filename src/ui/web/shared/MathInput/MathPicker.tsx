/**
 * MathPicker — hierarchical "+" menu for inserting math chips.
 *
 * Three views:
 *   1. Root:     three category buttons (Math / Functions / Geometry)
 *   2. Category: palette of basic tools, with a "+" to reveal advanced
 *   3. Tool:     named Hebrew-labelled fields, live KaTeX preview, Insert
 *
 * On Insert, the composed LaTeX is handed to `onInsert(latex)` which the
 * caller forwards to the TipTap-chip's `insert()` ref API.
 *
 * Mirrors the design handoff (aguy-chat-demo.html) — Hebrew labels are
 * baked in since the whole app targets Hebrew students; i18n is a follow-up
 * when we need English/other locales.
 */

'use client'

import React, { useMemo, useState } from 'react'
import katex from 'katex'
import { cn } from '@/infra/utils/ui'
import { ArrowRight, X } from 'lucide-react'
import { MATH_CATEGORIES, MATH_TOOLS, type MathTool, type ToolCategory } from './mathTools'

export interface MathPickerProps {
  onInsert: (latex: string) => void
  onClose?: () => void
  className?: string
}

type View =
  | { kind: 'root' }
  | { kind: 'category'; category: ToolCategory; expanded: boolean }
  | { kind: 'tool'; tool: MathTool }

export function MathPicker({ onInsert, onClose, className }: MathPickerProps) {
  const [view, setView] = useState<View>({ kind: 'root' })

  return (
    <div
      dir="rtl"
      className={cn('flex flex-col gap-content-gap-xs min-w-[260px] max-w-[320px]', className)}
    >
      <Header view={view} onBack={() => setView(backFor(view))} onClose={onClose} />

      {view.kind === 'root' && (
        <RootView onPick={(cat) => setView({ kind: 'category', category: cat, expanded: false })} />
      )}

      {view.kind === 'category' && (
        <CategoryView
          category={view.category}
          expanded={view.expanded}
          onExpand={() => setView({ ...view, expanded: true })}
          onPickTool={(tool) => setView({ kind: 'tool', tool })}
        />
      )}

      {view.kind === 'tool' && (
        <ToolEditor
          tool={view.tool}
          onInsert={(latex) => {
            onInsert(latex)
            setView({ kind: 'root' })
          }}
        />
      )}
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
  if (view.kind === 'category') return { kind: 'root' }
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
  const title =
    view.kind === 'tool'
      ? view.tool.label
      : view.kind === 'category'
        ? (MATH_CATEGORIES.find((c) => c.category === view.category)?.title ?? '')
        : 'הוסף להודעה'
  return (
    <div className="flex items-center gap-content-gap-xs pb-1 border-b border-border">
      {view.kind !== 'root' ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="חזרה"
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <span className="w-7" />
      )}
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

function RootView({ onPick }: { onPick: (c: ToolCategory) => void }) {
  return (
    <div className="flex flex-col gap-content-gap-xs">
      {MATH_CATEGORIES.map((c) => (
        <button
          key={c.category}
          type="button"
          onClick={() => onPick(c.category)}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-body-md text-foreground text-start"
        >
          <span>{c.title}</span>
          <ArrowRight className="w-4 h-4 rotate-180 text-muted-foreground" />
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
            +
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

  // For a zero-field tool (just `x`) auto-insert on click — users don't need
  // to see an editor for a bare symbol.
  const previewLatex = useMemo(() => tool.build(values), [tool, values])
  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(previewLatex, {
        throwOnError: false,
        output: 'html',
        macros: { '\\placeholder': '\\square' },
      })
    } catch {
      return '<span class="text-destructive text-body-xs">תצוגה מקדימה נכשלה</span>'
    }
  }, [previewLatex])

  const canInsert = tool.fields.every((f, i) => f.optional || (values[i] ?? '').trim().length > 0)

  if (tool.fields.length === 0) {
    // Immediately insert and let the parent collapse the picker.
    // (We still render the preview + Insert in case the auto-insert UX is
    // unexpected, but typical usage will hit this path once.)
    return (
      <div className="flex flex-col gap-content-gap-xs">
        <div
          dir="ltr"
          className="rounded-md border border-border bg-muted/40 px-3 py-3 min-h-[48px] flex items-center justify-center"
        >
          <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
        <button
          type="button"
          onClick={() => onInsert(previewLatex)}
          className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-body-sm font-semibold"
        >
          הוסף להודעה
        </button>
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

      <div
        dir="ltr"
        className="rounded-md border border-border bg-muted/40 px-3 py-3 min-h-[48px] flex items-center justify-center"
      >
        <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>

      <button
        type="button"
        disabled={!canInsert}
        onClick={() => onInsert(previewLatex)}
        className={cn(
          'px-3 py-2 rounded-md text-body-sm font-semibold transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        הוסף להודעה
      </button>
    </div>
  )
}
