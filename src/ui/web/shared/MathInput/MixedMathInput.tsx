/**
 * MixedMathInput — WYSIWYG chat/answer input where words stay as words and
 * math atoms (fractions, powers, roots) render inline with click-into-the-box
 * placeholders. Wraps MathLive's `<math-field>` in smart-mode so a toolbar's
 * `insert()` behaves like Word's equation editor.
 *
 * Mobile: `mathVirtualKeyboardPolicy = 'auto'` brings up MathLive's own
 * on-screen keyboard (the native soft keyboard never appears for a web
 * component). `'manual'` would leave the student with no way to type.
 */

'use client'

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { cn } from '@/infra/utils/ui'
import type { MathfieldElement } from 'mathlive'
import { markdownToLatex, latexToMarkdown } from './mathMarkdown'

export interface MixedMathInputProps {
  value: string
  onChange: (markdown: string) => void
  onEnterKey?: () => void
  onReady?: (el: MathfieldElement) => void
  onFocus?: () => void
  onBlur?: (e: FocusEvent) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  keyboardPolicy?: 'auto' | 'manual' | 'sandboxed'
}

export interface MixedMathInputRef {
  element: MathfieldElement | null
  focus: () => void
  insert: (latex: string) => void
}

// Narrow the full MathLive layout set down to what students actually need in
// chat/answer surfaces. The default layout includes matrices, sums, products,
// and calculus operators — overwhelming for the audience here. We only pin
// this once per browser session; subsequent mathfields inherit the setting.
let virtualKeyboardConfigured = false
function configureVirtualKeyboardOnce() {
  if (virtualKeyboardConfigured) return
  if (typeof window === 'undefined') return
  const vk = (window as unknown as { mathVirtualKeyboard?: { layouts: unknown } })
    .mathVirtualKeyboard
  if (!vk) return
  vk.layouts = ['numeric', 'alphabetic', 'greek']
  virtualKeyboardConfigured = true
}

export const MixedMathInput = forwardRef<MixedMathInputRef, MixedMathInputProps>(
  (
    {
      value,
      onChange,
      onEnterKey,
      onReady,
      onFocus,
      onBlur,
      disabled = false,
      placeholder,
      className,
      keyboardPolicy = 'auto',
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mfeRef = useRef<MathfieldElement | null>(null)
    const currentMarkdown = useRef(value)
    const handlers = useRef({ onChange, onEnterKey, onReady, onFocus, onBlur })
    handlers.current = { onChange, onEnterKey, onReady, onFocus, onBlur }

    // Also expose the live mathfield via state so the imperative handle
    // (and anyone consuming `.element`) sees the real element once the
    // dynamic MathLive import resolves — not the `null` captured at mount.
    const [mathfield, setMathfield] = useState<MathfieldElement | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        element: mathfield,
        focus: () => mathfield?.focus(),
        insert: (latex: string) =>
          mathfield?.insert(latex, { selectionMode: 'placeholder', focus: true }),
      }),
      [mathfield],
    )

    useEffect(() => {
      let destroyed = false
      const container = containerRef.current

      async function init() {
        const { MathfieldElement } = await import('mathlive')
        if (destroyed || !container) return

        const mfe = new MathfieldElement()
        mfe.smartMode = true
        mfe.mathVirtualKeyboardPolicy = keyboardPolicy
        if (placeholder) mfe.placeholder = placeholder
        mfe.readOnly = disabled
        mfe.setValue(markdownToLatex(value), { silenceNotifications: true })

        mfe.addEventListener('input', () => {
          const next = latexToMarkdown(mfe.value)
          if (currentMarkdown.current !== next) {
            currentMarkdown.current = next
            handlers.current.onChange(next)
          }
        })

        mfe.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey && handlers.current.onEnterKey) {
            e.preventDefault()
            e.stopPropagation()
            handlers.current.onEnterKey()
          }
        })

        if (handlers.current.onFocus) {
          mfe.addEventListener('focus', () => handlers.current.onFocus?.())
        }
        if (handlers.current.onBlur) {
          mfe.addEventListener('blur', (e: FocusEvent) => handlers.current.onBlur?.(e))
        }

        container.appendChild(mfe)
        mfeRef.current = mfe

        // Start empty fields in text mode so the first Hebrew/English word
        // isn't swallowed into math mode (default) and rendered as italic
        // variables. Smart-mode will still flip to math when the student
        // types digits or math-ish patterns.
        if (!value) {
          try {
            mfe.mode = 'text'
          } catch {
            /* field not fully ready; smart-mode will catch up on first keystroke */
          }
        }

        configureVirtualKeyboardOnce()
        setMathfield(mfe)
        handlers.current.onReady?.(mfe)
      }

      init()

      return () => {
        destroyed = true
        const mfe = mfeRef.current
        if (mfe && container) {
          try {
            mfe.blur()
            if (document.activeElement === mfe) {
              ;(document.activeElement as HTMLElement).blur()
            }
            container.removeChild(mfe)
          } catch {
            /* already removed */
          }
          mfeRef.current = null
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      if (mfeRef.current && currentMarkdown.current !== value) {
        const pos = mfeRef.current.position
        mfeRef.current.setValue(markdownToLatex(value), { silenceNotifications: true })
        mfeRef.current.position = pos
        currentMarkdown.current = value
      }
    }, [value])

    useEffect(() => {
      if (mfeRef.current) mfeRef.current.readOnly = disabled
    }, [disabled])

    return <div ref={containerRef} className={cn('mixed-math-input', className)} />
  },
)

MixedMathInput.displayName = 'MixedMathInput'
