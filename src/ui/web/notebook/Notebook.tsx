'use client'

import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { NotebookPen, Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NotebookCanvas } from './NotebookCanvas'
import { useNotebook } from './useNotebook'

// Pen ink tokens live in globals.css (`--pen-ink-1..4`) so dark mode and
// brand re-theming re-tint canvas strokes automatically. We resolve them
// to an `hsl(...)` string once when the drawer opens so canvas2d has a
// concrete color to stroke with.
const PEN_INK_VARS = ['--pen-ink-1', '--pen-ink-2', '--pen-ink-3', '--pen-ink-4'] as const
const PEN_SIZES = [2, 4, 8]
const FALLBACK_INK = 'hsl(222 47% 11%)'

interface NotebookProps {
  /** Unique identifier for the notes scope (e.g. exercise or lesson id). */
  storageKey: string
  /**
   * Optional class merged into the floating action button. Callers whose
   * layout has a competing pinned element (chat input, mobile bottom nav)
   * can nudge the button up/left/right without touching this component.
   */
  fabClassName?: string
}

export function Notebook({ storageKey, fabClassName }: NotebookProps) {
  const t = useTranslations('notebook')
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')
  const [open, setOpen] = useState(false)
  const [colors, setColors] = useState<string[]>([FALLBACK_INK])
  const [color, setColor] = useState<string>(FALLBACK_INK)
  const [size, setSize] = useState(PEN_SIZES[1])
  const { strokes, addStroke, undo, clear } = useNotebook(storageKey)

  // Read the pen-ink CSS vars on open. Deferred until the drawer is
  // actually needed so we don't churn on every mount.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const style = getComputedStyle(document.documentElement)
    const resolved = PEN_INK_VARS.map((v) => {
      const raw = style.getPropertyValue(v).trim()
      return raw ? `hsl(${raw})` : FALLBACK_INK
    })
    setColors(resolved)
    setColor((prev) => (resolved.includes(prev) ? prev : resolved[0]))
  }, [open])

  // Drawer sits on the logical `end` side, so it enters from that edge.
  // In LTR that's off-screen right (+100%); in RTL it's off-screen left.
  const enterOffset = rtl ? '-100%' : '100%'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        title={t('title')}
        className={cn(
          'fixed bottom-20 end-4 z-[300] h-12 w-12 rounded-full',
          'bg-primary text-primary-foreground shadow-elevation-3',
          'flex items-center justify-center hover:bg-primary/90 transition-colors',
          fabClassName,
        )}
      >
        <NotebookPen className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[350] bg-black/30"
            />
            <motion.aside
              initial={{ x: enterOffset }}
              animate={{ x: 0 }}
              exit={{ x: enterOffset }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 end-0 z-[360] w-full max-w-md bg-card border-s border-border shadow-elevation-4 flex flex-col"
            >
              <header className="flex items-center justify-between p-3 border-b border-border">
                <h2 className="text-body-md font-semibold text-foreground">{t('title')}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="flex-1 min-h-0 overflow-hidden">
                <NotebookCanvas
                  strokes={strokes}
                  onStrokeComplete={addStroke}
                  color={color}
                  size={size}
                />
              </div>

              <footer className="border-t border-border p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-content-gap-xs">
                  {colors.map((c, i) => (
                    <button
                      key={PEN_INK_VARS[i] ?? c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`${t('color')} ${i + 1}`}
                      className={cn(
                        'h-7 w-7 rounded-full border-2 transition-all',
                        color === c ? 'border-foreground scale-110' : 'border-transparent',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {PEN_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-label={`${t('thickness')} ${s}`}
                      className={cn(
                        'h-7 w-7 rounded-md border transition-colors flex items-center justify-center',
                        size === s
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <span className="rounded-full bg-current" style={{ height: s, width: s }} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={strokes.length === 0}
                    aria-label={t('undo')}
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    disabled={strokes.length === 0}
                    aria-label={t('clear')}
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
