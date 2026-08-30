'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { FormulaComposer } from '@/ui/web/shared/MathInput/FormulaComposer'
import { AnimatePresence, motion } from 'framer-motion'
import { FunctionSquare, Loader2, Send } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

interface ChatInputPanelProps {
  disabled?: boolean
  isSending: boolean
  placeholder: string
  sendLabel: string
  onSubmit: (text: string) => void
}

export function ChatInputPanel({
  disabled,
  isSending,
  placeholder,
  sendLabel,
  onSubmit,
}: ChatInputPanelProps) {
  const t = useTranslations('courses')
  const [value, setValue] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled || isSending) return
    onSubmit(trimmed)
    setValue('')
    setComposerOpen(false)
  }

  // Insert the composed LaTeX at the caret position, wrapping in $...$ so
  // MathMarkdown renders it downstream. Mirrors FreeResponseQuestion's
  // behavior so students get one consistent math-input experience across
  // free-response answers, chat, and this chat-lesson panel.
  const handleFormulaInsert = useCallback(
    (latex: string) => {
      const el = inputRef.current
      const start = el?.selectionStart ?? value.length
      const end = el?.selectionEnd ?? value.length
      const wrapped = `$${latex}$`
      setValue(value.substring(0, start) + wrapped + value.substring(end))
      setComposerOpen(false)
      requestAnimationFrame(() => {
        const caret = start + wrapped.length
        el?.focus()
        el?.setSelectionRange(caret, caret)
      })
    },
    [value],
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="relative border-t border-border bg-card px-4 py-3 print:hidden"
    >
      <div
        className="max-w-2xl mx-auto flex items-center gap-content-gap-xs"
        dir="rtl"
        data-math-controls
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isSending}
            dir="rtl"
            className={cn(
              'w-full rounded-xl border border-input bg-background pe-11 ps-4 py-2.5',
              'text-body-md text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => setComposerOpen((open) => !open)}
              aria-label={t('insertFormula')}
              title={t('insertFormula')}
              className={cn(
                'absolute end-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center',
                'w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20',
                'transition-colors',
              )}
            >
              <FunctionSquare className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || isSending || !value.trim()}
          aria-label={sendLabel}
          className={cn(
            'px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold',
            'flex items-center gap-content-gap-xs hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">{sendLabel}</span>
        </button>
      </div>

      {/* Popup formula composer — anchored above the input so it doesn't get
          clipped by the surrounding bubble/scroll containers. */}
      <AnimatePresence>
        {composerOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full inset-x-0 mb-2 px-4"
            data-math-controls
          >
            <div className="max-w-2xl mx-auto">
              <FormulaComposer
                onInsert={handleFormulaInsert}
                onClose={() => setComposerOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}
