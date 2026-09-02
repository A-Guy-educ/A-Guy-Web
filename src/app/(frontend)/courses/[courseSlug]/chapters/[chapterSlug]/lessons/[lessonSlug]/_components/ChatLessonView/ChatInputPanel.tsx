'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { FormulaComposer } from '@/ui/web/shared/MathInput/FormulaComposer'
import { AnimatePresence, motion } from 'framer-motion'
import { FunctionSquare, Loader2, Plus, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!plusMenuOpen) return undefined
    const onClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setPlusMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [plusMenuOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled || isSending) return
    onSubmit(trimmed)
    setValue('')
    setComposerOpen(false)
    setPlusMenuOpen(false)
  }

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
      className={cn(
        'absolute bottom-0 inset-x-0 z-30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden',
        'bg-gradient-to-t from-background via-background/92 to-transparent',
        'pointer-events-none',
      )}
    >
      <div className="max-w-2xl mx-auto relative pointer-events-auto" dir="rtl" data-math-controls>
        {/* Floating pill */}
        <div
          className={cn(
            'flex items-center gap-content-gap-xs px-3 py-1.5 rounded-full',
            'bg-card/95 backdrop-blur-md border border-border shadow-card',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isSending}
            dir="rtl"
            className={cn(
              'flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-1',
              'text-body-md text-foreground placeholder:text-muted-foreground',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          />

          {/* Plus menu — flyout with attach / math options */}
          {!disabled && (
            <div className="relative shrink-0" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setPlusMenuOpen((v) => !v)}
                aria-label={t('chatViewMoreActions')}
                aria-expanded={plusMenuOpen}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90',
                  'bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border',
                )}
              >
                <Plus className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {plusMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className={cn(
                      'absolute bottom-11 end-0 w-52 z-50 p-1.5 space-y-0.5',
                      'bg-card/98 backdrop-blur-md border border-border shadow-card-hover rounded-2xl',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPlusMenuOpen(false)
                        setComposerOpen(true)
                      }}
                      className="w-full flex items-center gap-content-gap-xs px-2.5 py-2 hover:bg-muted active:bg-muted/70 rounded-xl text-start transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
                        <FunctionSquare className="w-4 h-4" />
                      </span>
                      <span className="font-medium text-body-sm text-foreground">
                        {t('insertFormula')}
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            type="submit"
            disabled={disabled || isSending || !value.trim()}
            aria-label={sendLabel}
            className={cn(
              'w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90',
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-elevation-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Popup formula composer — anchored above the pill so it doesn't get
            clipped by the surrounding scroll container. */}
        <AnimatePresence>
          {composerOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-full inset-x-0 mb-2"
              data-math-controls
            >
              <FormulaComposer
                onInsert={handleFormulaInsert}
                onClose={() => setComposerOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
