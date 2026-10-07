'use client'

import { isRTL } from '@/i18n/config'
import { useRouterWithLoading } from '@/infra/loading/hooks/useRouterWithLoading'
import type { LessonMode } from '@/infra/types/lesson-view'
import { cn } from '@/infra/utils/ui'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Menu,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { LessonMenuMute, LessonMenuRestart } from './LessonMenuContext'

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
  /** Optional TTS mute toggle rendered as a menu item. Chat view wires
   *  this from `useBrowserTTS`; other view modes omit it. */
  mute?: LessonMenuMute
  /** Optional restart action rendered as a menu item. Chat view uses this
   *  so its "start over" affordance can live in the menu instead of the
   *  top-level floating slot. */
  restart?: LessonMenuRestart
  /** Hide the dropdown's back entry — see `LessonMenuConfig.hideBack`. */
  hideBack?: boolean
  /**
   * Back-button semantics. `'lesson'` promises a course destination (label =
   * "back to home page", push straight to `backUrl`). `'standalone'` (the default
   * when neither this prop nor `tabs` is set) uses browser history and a
   * neutral "back" label. When `tabs.length > 0` (DualModeLessonView publishes
   * tabs via LessonMenuProvider), lesson semantics apply automatically so this
   * prop only needs to be set by lesson callers that don't ship tabs
   * (LessonIntroPage's empty-workspace branches).
   */
  variant?: 'lesson' | 'standalone'
}

const PANEL_ID = 'lesson-menu-panel'

export function LessonMenu({
  lessonTitle,
  tabs = [],
  activeMode,
  onSelectMode,
  backUrl,
  mute,
  restart,
  hideBack = false,
  variant,
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

  // A caller is a "lesson surface" if it either publishes tabs (DualModeLessonView
  // via LessonMenuProvider) or explicitly opts in via `variant="lesson"`
  // (LessonIntroPage's empty-workspace branches, which render lesson chrome
  // without a tab picker). Lesson surfaces get the direct-to-course push and
  // the "back to home page" label. Ask (no tabs, no variant) keeps the previous
  // router.back() escape and a neutral "Back" label.
  const onLessonSurface = variant === 'lesson' || tabs.length > 0

  const handleBack = () => {
    setOpen(false)
    if (onLessonSurface) {
      router.push(backUrl ?? '/courses')
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else if (backUrl) {
      router.push(backUrl)
    } else {
      router.push('/courses')
    }
  }

  // Shares the current lesson URL (strips query params so the recipient lands on the
  // lesson intro, not whichever tab/exercise the sharer happens to be viewing).
  const handleShare = async () => {
    setOpen(false)
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}${window.location.pathname}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: lessonTitle, url: shareUrl })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t('linkCopied'))
    }
  }

  const BackIcon = rtl ? ArrowRight : ArrowLeft

  return (
    <>
      {/* Floating chrome: menu + back buttons at logical `start` (top-left
          LTR, top-right RTL) so they don't collide with MobileChatPanel's
          close-X on the opposite edge. The lesson title lives inside the
          dropdown header; chat view shows it in a dedicated cycling pill. */}
      <div
        style={{ top: 'calc(0.5rem + env(safe-area-inset-top))' }}
        className="fixed start-3 z-[400] flex items-center gap-1.5"
      >
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
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            'bg-card/95 backdrop-blur border border-border shadow-elevation-2',
            'text-foreground hover:bg-muted transition-colors',
          )}
        >
          <Menu className="w-4 h-4 text-primary" />
        </button>
        {!hideBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label={onLessonSurface ? t('backToCourse') : t('back')}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              'bg-card/95 backdrop-blur border border-border shadow-elevation-2',
              'text-foreground hover:bg-muted transition-colors',
            )}
          >
            <BackIcon className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

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
              {/* Lesson name section — the dropdown is the one place the
                  title shows up for all view modes. (Chat view also surfaces
                  it in a cycling pill, but the pill is chat-only.) */}
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

              {/* TTS mute toggle — surfaced here when the current view mode
                  supports narration (chat view). Other modes omit `mute`. */}
              {mute && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    mute.onToggle()
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2',
                    'text-body-sm font-medium bg-muted text-foreground hover:bg-muted/70',
                    'transition-colors',
                  )}
                >
                  <span className="flex items-center gap-content-gap-xs">
                    {mute.muted ? (
                      <VolumeX className="w-4 h-4 text-primary" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-primary" />
                    )}
                    {mute.muted ? mute.unmuteLabel : mute.muteLabel}
                  </span>
                </button>
              )}

              {/* Restart this view — chat view uses this slot so its
                  reset action lives in the menu instead of the top-level
                  floating button (freed up for back-to-course). */}
              {restart && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    restart.onReset()
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2',
                    'text-body-sm font-medium bg-muted text-foreground hover:bg-muted/70',
                    'transition-colors',
                  )}
                >
                  <span className="flex items-center gap-content-gap-xs">
                    <RotateCcw className="w-4 h-4 text-primary" />
                    {restart.label}
                  </span>
                </button>
              )}

              {/* Share lesson */}
              <button
                type="button"
                role="menuitem"
                onClick={handleShare}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2',
                  'text-body-sm font-medium bg-muted text-foreground hover:bg-muted/70',
                  'transition-colors',
                )}
              >
                <span className="flex items-center gap-content-gap-xs">
                  <Share2 className="w-4 h-4 text-primary" />
                  {t('shareLesson')}
                </span>
              </button>

              {/* Back navigation lives in the floating pill alongside the
                  menu button — see the fixed chrome above — so the dropdown
                  itself no longer duplicates a back entry. */}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
