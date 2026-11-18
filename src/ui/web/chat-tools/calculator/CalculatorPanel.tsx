'use client'

import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { INITIAL_CALCULATOR_STATE, pressKey, type CalculatorKey } from './calculator-engine'

type KeyStyle = 'number' | 'function' | 'operator' | 'danger' | 'strong'

/** [label, value, style] — the 5×7 grid, left to right regardless of locale. */
const KEYS: ReadonlyArray<readonly [string, CalculatorKey, KeyStyle]> = [
  ['2nd', 'SECOND', 'function'],
  ['sin', 'SIN', 'function'],
  ['cos', 'COS', 'function'],
  ['tan', 'TAN', 'function'],
  ['DEG', 'ANGLE', 'function'],
  ['π', 'π', 'function'],
  ['log', 'log(', 'function'],
  ['ln', 'ln(', 'function'],
  ['√', '√(', 'function'],
  ['÷', '÷', 'operator'],
  ['x²', '^2', 'function'],
  ['xʸ', '^', 'function'],
  ['(', '(', 'function'],
  [')', ')', 'function'],
  ['×', '×', 'operator'],
  ['7', '7', 'number'],
  ['8', '8', 'number'],
  ['9', '9', 'number'],
  ['⌫', 'DEL', 'danger'],
  ['−', '−', 'operator'],
  ['4', '4', 'number'],
  ['5', '5', 'number'],
  ['6', '6', 'number'],
  ['1/x', 'RECIP', 'function'],
  ['+', '+', 'operator'],
  ['1', '1', 'number'],
  ['2', '2', 'number'],
  ['3', '3', 'number'],
  ['%', '%', 'function'],
  ['Ans', 'ANS', 'function'],
  ['±', 'NEGATE', 'function'],
  ['0', '0', 'number'],
  ['.', '.', 'number'],
  ['n!', '!', 'function'],
  ['=', '=', 'strong'],
]

const KEY_STYLES: Record<KeyStyle, string> = {
  number: 'bg-card text-foreground hover:bg-muted',
  function: 'bg-muted/60 text-foreground/80 hover:bg-muted',
  operator: 'border-primary/15 bg-primary/5 text-primary text-body-lg hover:bg-primary/10',
  danger: 'bg-primary/5 text-primary hover:bg-primary/10',
  strong:
    'border-primary bg-primary text-primary-foreground text-body-lg font-bold hover:bg-primary/90',
}

const KEYBOARD_ALIASES: Record<string, CalculatorKey> = {
  Enter: '=',
  Backspace: 'DEL',
  Delete: 'C',
  '/': '÷',
  '*': '×',
  '-': '−',
  p: 'π',
}
const KEYBOARD_KEYS = new Set(['+', '−', '×', '÷', '^', '(', ')', '%', '=', 'DEL', 'C', 'π', '!'])

const INVERSE_LABELS: Record<string, string> = { SIN: 'sin⁻¹', COS: 'cos⁻¹', TAN: 'tan⁻¹' }

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, [contenteditable="true"]'))
  )
}

export function CalculatorPanel() {
  const t = useTranslations('courses.chatTools')
  const [state, press] = useReducer(pressKey, INITIAL_CALCULATOR_STATE)
  const mainRef = useRef<HTMLDivElement>(null)

  // Keyboard entry while the panel is open (it is only mounted while active).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      const key = KEYBOARD_ALIASES[event.key] ?? event.key
      if (/^[0-9.]$/.test(key) || KEYBOARD_KEYS.has(key)) {
        event.preventDefault()
        press(key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Keep the end of a long expression visible.
  useLayoutEffect(() => {
    const main = mainRef.current
    if (main) main.scrollLeft = main.scrollWidth
  }, [state.expression])

  const labelFor = (label: string, value: CalculatorKey) => {
    if (value === 'ANGLE') return state.angle
    if (state.inverse && INVERSE_LABELS[value]) return INVERSE_LABELS[value]
    return label
  }

  return (
    <div className="flex flex-col gap-3 p-card-padding-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => press('C')}
          className="text-body-xs font-medium text-primary hover:underline"
        >
          {t('calcClear')}
        </button>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-body-2xs font-bold tracking-wide text-primary">
          {state.angle}
        </span>
      </div>

      <div
        dir="ltr"
        aria-live="polite"
        className="flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-xl border border-border bg-muted/40 px-3.5 py-3"
      >
        <div className="truncate text-end text-body-xs text-muted-foreground">{state.previous}</div>
        {state.error ? (
          <div dir="auto" className="text-start text-body-sm font-medium text-error">
            {t(`calcErrors.${state.error}`)}
          </div>
        ) : (
          <div
            ref={mainRef}
            className="overflow-x-auto whitespace-nowrap text-heading-lg font-semibold tabular-nums text-foreground [scrollbar-width:thin]"
          >
            {state.expression || '0'}
          </div>
        )}
      </div>

      <div dir="ltr" role="group" aria-label={t('calcKeypad')} className="grid grid-cols-5 gap-1.5">
        {KEYS.map(([label, value, style]) => {
          const toggled = value === 'SECOND' && state.inverse
          return (
            <button
              key={value}
              type="button"
              onClick={() => press(value)}
              aria-pressed={value === 'SECOND' ? state.inverse : undefined}
              className={cn(
                'flex h-10 min-w-0 items-center justify-center rounded-lg border border-border text-body-sm font-medium transition-[background-color,transform] duration-fast active:scale-95',
                toggled ? 'border-primary/40 bg-primary/15 text-primary' : KEY_STYLES[style],
              )}
            >
              {labelFor(label, value)}
            </button>
          )
        })}
      </div>

      <p className="text-center text-body-2xs text-muted-foreground">{t('calcFootnote')}</p>
    </div>
  )
}
