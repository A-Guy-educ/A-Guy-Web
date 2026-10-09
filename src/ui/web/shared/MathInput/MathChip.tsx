/**
 * MathChip — TipTap NodeView for an inline math atom.
 *
 * Collapsed: KaTeX-rendered math inside a pill-shaped chip. Clicking it opens
 * a popover with a math-only MathLive field so the student can edit the
 * formula with placeholder-box UX (Word-style). Blur closes the popover and
 * writes the new latex back into the node attrs.
 *
 * The chip is atomic — one backspace from the editor deletes the whole chip,
 * which is exactly the "words formulas, moved and edited, keep structure"
 * mental model we want.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { cn } from '@/infra/utils/ui'
import katex from 'katex'
import type { MathfieldElement } from 'mathlive'

export function MathChip({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const latex = ((node.attrs as { latex?: string }).latex ?? '').trim()
  const [editing, setEditing] = useState(latex === '')
  const [draft, setDraft] = useState(latex)
  const popoverRef = useRef<HTMLDivElement>(null)
  const mathFieldHostRef = useRef<HTMLDivElement>(null)
  const mathFieldRef = useRef<MathfieldElement | null>(null)

  // KaTeX render for the collapsed chip. We alias MathLive's
  // `\placeholder{}` to KaTeX's `\square` so empty argument slots render as
  // visible boxes instead of blowing up renderToString.
  const html = latex
    ? katex.renderToString(latex, {
        throwOnError: false,
        output: 'html',
        macros: { '\\placeholder': '\\square' },
      })
    : '<span class="opacity-50">∅</span>'

  // Mount MathLive inside the popover when entering edit mode.
  useEffect(() => {
    if (!editing) return
    let destroyed = false
    const host = mathFieldHostRef.current
    if (!host) return

    import('mathlive').then(({ MathfieldElement }) => {
      if (destroyed || !host) return
      const mfe = new MathfieldElement()
      mfe.mathVirtualKeyboardPolicy = 'auto'
      mfe.setValue(draft, { silenceNotifications: true })
      mfe.addEventListener('input', () => setDraft(mfe.value))
      mfe.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish(mfe.value)
        }
      })
      host.appendChild(mfe)
      mathFieldRef.current = mfe
      // Focus a tick later so MathLive's internal setup completes first.
      requestAnimationFrame(() => mfe.focus())
    })

    return () => {
      destroyed = true
      const mfe = mathFieldRef.current
      if (mfe) {
        try {
          mfe.blur()
          mfe.remove()
        } catch {
          /* already removed */
        }
        mathFieldRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // Close the popover when the student clicks outside it.
  useEffect(() => {
    if (!editing) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null
      if (!popoverRef.current || !target) return
      if (!popoverRef.current.contains(target)) {
        finish(mathFieldRef.current?.value ?? draft)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function finish(nextLatex: string) {
    const trimmed = nextLatex.trim()
    if (!trimmed) {
      deleteNode()
      return
    }
    updateAttributes({ latex: trimmed })
    setEditing(false)
  }

  return (
    <NodeViewWrapper as="span" className="math-chip-wrapper relative inline-block align-middle">
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEditing(true)
          }
        }}
        className={cn(
          'math-chip inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md cursor-pointer',
          'border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50',
          'transition-colors align-middle',
          selected && 'ring-2 ring-primary ring-offset-1',
        )}
        // KaTeX output is static, trusted (we rendered it), and small.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {editing && (
        <span
          ref={popoverRef}
          contentEditable={false}
          className="absolute top-full start-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-elevation-2 p-2 flex items-center gap-content-gap-xs min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={mathFieldHostRef} className="math-chip-editor flex-1" />
        </span>
      )}
    </NodeViewWrapper>
  )
}
