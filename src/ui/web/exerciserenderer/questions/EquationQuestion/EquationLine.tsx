import React from 'react'
import { cn } from '@/infra/utils/ui'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

type EquationLineTone = 'action' | 'helpful' | 'final'

// `.katex` sets its own color, so a tone has to target it rather than inherit.
const TONE_CLASS: Record<EquationLineTone, string> = {
  action: '[&_.katex]:text-destructive',
  helpful: '[&_.katex]:text-success',
  final: '[&_.katex]:text-success',
}

const ROW_CLASS: Record<EquationLineTone, string> = {
  action: 'mt-1',
  helpful: 'rounded-lg bg-success/10',
  final: '',
}

interface EquationLineProps {
  left: string
  right: string
  tone?: EquationLineTone
}

/** One notebook row: left side, `=`, right side. Math stays LTR on Hebrew pages. */
export function EquationLine({ left, right, tone }: EquationLineProps) {
  // KaTeX resets font-weight too, so bold has to be part of the LaTeX.
  const math = (latex: string, bold: boolean) => (bold ? `$\\boldsymbol{${latex}}$` : `$${latex}$`)
  const isFinal = tone === 'final'

  return (
    <div
      dir="ltr"
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center gap-content-gap-xs max-w-sm mx-auto text-center text-heading-lg',
        tone && ROW_CLASS[tone],
      )}
    >
      <MathMarkdown content={math(left, !!tone)} className={tone && TONE_CLASS[tone]} />
      <MathMarkdown
        content={math('=', isFinal)}
        className={isFinal ? TONE_CLASS.final : undefined}
      />
      <MathMarkdown content={math(right, !!tone)} className={tone && TONE_CLASS[tone]} />
    </div>
  )
}
