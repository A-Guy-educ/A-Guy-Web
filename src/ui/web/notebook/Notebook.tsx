'use client'

import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import { useLocale } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { NotebookPen, Trash2, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { NotebookCanvas } from './NotebookCanvas'
import { useNotebook } from './useNotebook'

// Small preset palettes so the demo stays lightweight — we can promote
// these to design tokens once the feature graduates from client-only.
const PEN_COLORS = ['#111827', '#dc2626', '#2563eb', '#16a34a']
const PEN_SIZES = [2, 4, 8]

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
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')
  const [open, setOpen] = useState(false)
  const [color, setColor] = useState(PEN_COLORS[0])
  const [size, setSize] = useState(PEN_SIZES[1])
  const { strokes, addStroke, undo, clear } = useNotebook(storageKey)

  // Drawer sits on the logical `end` side, so it enters from that edge.
  // In LTR that's off-screen right (+100%); in RTL it's off-screen left.
  const enterOffset = rtl ? '-100%' : '100%'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="פתח מחברת"
        title="מחברת"
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
                <h2 className="text-body-md font-semibold text-foreground">מחברת</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="סגור מחברת"
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
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`צבע ${c}`}
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
                      aria-label={`עובי ${s}`}
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
                    aria-label="בטל פעולה"
                    className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    disabled={strokes.length === 0}
                    aria-label="נקה הכל"
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
