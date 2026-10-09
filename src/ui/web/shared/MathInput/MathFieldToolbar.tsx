/**
 * MathFieldToolbar — Quick-insert buttons for common math structures.
 * Fires `onInsert(latex)` with templates that use `\placeholder{}` for
 * empty argument slots so the MathLive chip editor can position the cursor
 * in the first empty box (Word-style equation editor behavior).
 */

'use client'

import React from 'react'
import { cn } from '@/infra/utils/ui'

interface ToolbarButton {
  label: string
  latex: string
  ariaLabel: string
}

const BUTTONS: ToolbarButton[] = [
  { label: 'a/b', latex: '\\frac{\\placeholder{}}{\\placeholder{}}', ariaLabel: 'Fraction' },
  { label: 'xⁿ', latex: '\\placeholder{}^{\\placeholder{}}', ariaLabel: 'Exponent' },
  { label: '√', latex: '\\sqrt{\\placeholder{}}', ariaLabel: 'Square root' },
  { label: 'x₂', latex: '\\placeholder{}_{\\placeholder{}}', ariaLabel: 'Subscript' },
  { label: '( )', latex: '\\left(\\placeholder{}\\right)', ariaLabel: 'Parentheses' },
  { label: 'π', latex: '\\pi', ariaLabel: 'Pi' },
  { label: '≤', latex: '\\leq', ariaLabel: 'Less than or equal' },
  { label: '≥', latex: '\\geq', ariaLabel: 'Greater than or equal' },
  { label: '≠', latex: '\\neq', ariaLabel: 'Not equal' },
  { label: '±', latex: '\\pm', ariaLabel: 'Plus minus' },
]

export interface MathFieldToolbarProps {
  onInsert: (latex: string) => void
  className?: string
}

export function MathFieldToolbar({ onInsert, className }: MathFieldToolbarProps) {
  return (
    <div
      className={cn('flex gap-1 overflow-x-auto scrollbar-none py-1', className)}
      role="toolbar"
      aria-label="Math symbols"
    >
      {BUTTONS.map((btn) => (
        <button
          key={btn.ariaLabel}
          type="button"
          className={cn(
            'shrink-0 min-w-[44px] h-10 px-2.5 rounded-md',
            'border border-border bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground',
            'transition-colors text-body-md',
          )}
          onClick={() => onInsert(btn.latex)}
          aria-label={btn.ariaLabel}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}
