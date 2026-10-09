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

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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

    useImperativeHandle(
      ref,
      () => ({
        element: mfeRef.current,
        focus: () => mfeRef.current?.focus(),
        insert: (latex: string) =>
          mfeRef.current?.insert(latex, { selectionMode: 'placeholder', focus: true }),
      }),
      [],
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
