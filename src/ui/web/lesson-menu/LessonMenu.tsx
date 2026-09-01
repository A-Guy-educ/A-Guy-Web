'use client'

import { isRTL } from '@/i18n/config'
import { useRouterWithLoading } from '@/infra/loading/hooks/useRouterWithLoading'
import type { LessonMode } from '@/infra/types/lesson-view'
import { cn } from '@/infra/utils/ui'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Check, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Floating menu button + dropdown that replaces the old exercise chrome
 * (title + logo row and the tab bar underneath). Ports the concept the
 * boss shared in `תצוגה.HTML` — a single unobtrusive pill on the top edge
 * that exposes lesson name, view-mode switcher, and back-to-lesson.
 *
 * WHY floating over per-view chrome:
 *   - The lesson page already hides the site header + footer via the
 *     `hideChrome` allowlist (root layout), so the top edge is free.
 *   - Interactive / chat / media / test all mount full-viewport shells;
 *     giving each one its own top bar wasted vertical space and forced
 *     the caller (DualModeLessonView) to thread a `headerSlot` prop
 *     through every branch.
 *   - A `position: fixed` pill floats over whichever view is active so
 *     the switch never blinks header chrome in/out.
 */
export interface LessonMenuTab {
  mode: LessonMode
  label: string
}

interface LessonMenuProps {
  lessonTitle: string
  /**
   * Ordered list of view-mode tabs the current lesson permits. Empty (or
   * length-1) collapses the dropdown to a lesson-name header + back
   * button — the Ask page uses this variant since it has no view modes.
   */
  tabs?: LessonMenuTab[]
  activeMode?: LessonMode
  onSelectMode?: (mode: LessonMode) => void
  /** Optional fallback URL when the browser's back history is empty. */
  backUrl?: string
}

const PANEL_ID = 'lesson-menu-panel'

export function LessonMenu({
  lessonTitle,
  tabs = [],
  activeMode,
  onSelectMode,
  backUrl,
}: LessonMenuProps) {
  const t = useTranslations('courses')
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')
  const router = useRouterWithLoading()
  const [open, setOpen] = useState(false)

  // Close on Escape so keyboard users have a way out.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleBack = () => {
    setOpen(false)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else if (backUrl) {
      router.push(backUrl)
    } else {
      router.push('/courses')
    }
  }

  const BackIcon = rtl ? ArrowRight : ArrowLeft

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('lessonViewMode')}
        aria-haspopup="menu"
        aria-expanded={open}
        // Only advertise the panel when it's actually in the DOM
        // (`AnimatePresence` unmounts it on close). A dangling
        // `aria-controls` reference confuses some AT vendors.
        aria-controls={open ? PANEL_ID : undefined}
        style={{ top: 'calc(0.5rem + env(safe-area-inset-top))' }}
        className={cn(
          // Sits at logical `start` (top-left LTR, top-right RTL) so it
          // doesn't collide with MobileChatPanel's close-X, which is at
          // `end` for both directions. Hamburger-only per spec — the
          // lesson title lives inside the dropdown instead.
          'fixed start-3 z-[400] flex items-center justify-center',
          'h-9 w-9 rounded-full',
          'bg-card/95 backdrop-blur border border-border shadow-elevation-2',
          'text-foreground hover:bg-muted transition-colors',
        )}
      >
        <Menu className="w-4 h-4 text-primary" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[410] bg-black/20"
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              role="menu"
              id={PANEL_ID}
              style={{ top: 'calc(3rem + env(safe-area-inset-top))' }}
              className={cn(
                // Anchored to the same edge as the trigger pill above so
                // the dropdown lines up cleanly with the button that
                // opened it.
                'fixed start-3 z-[420] w-72 max-w-[calc(100vw-1.5rem)]',
                'bg-card border border-border shadow-elevation-4 rounded-2xl p-3',
                'flex flex-col gap-3',
              )}
            >
              {/* Lesson name section */}
              <div className="pb-2 border-b border-border">
                <div className="flex items-center gap-content-gap-xs text-body-2xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  {t('lessonViewMode')}
                </div>
                <div className="text-body-sm font-bold text-foreground leading-snug">
                  {lessonTitle}
                </div>
              </div>

              {/* View-mode switcher — hidden when the lesson has 0 or 1
                  mode (nothing to switch between), or when the caller
                  didn't wire `onSelectMode` (Ask page). */}
              {tabs.length > 1 && onSelectMode && (
                <div className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const active = tab.mode === activeMode
                    return (
                      <button
                        key={tab.mode}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          onSelectMode(tab.mode)
                          setOpen(false)
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2',
                          'text-body-sm font-medium transition-colors',
                          active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                        )}
                      >
                        <span>{tab.label}</span>
                        {active && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Back navigation */}
              <button
                type="button"
                role="menuitem"
                onClick={handleBack}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2',
                  'text-body-sm font-medium bg-muted text-foreground hover:bg-muted/70',
                  'transition-colors',
                )}
              >
                <span className="flex items-center gap-content-gap-xs">
                  <BackIcon className="w-4 h-4 text-primary" />
                  {t('backToLesson')}
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
