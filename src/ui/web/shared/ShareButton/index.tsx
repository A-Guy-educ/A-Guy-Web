'use client'

import { Share2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ShareButtonProps {
  /** Title of the thing being shared — becomes the OS share-sheet title and the clipboard "copied" context. */
  title: string
  /** Optional short description for the share sheet; omitted on clipboard fallback. */
  text?: string
  /**
   * URL to share. Accepts absolute (`https://…`) or site-relative (`/courses/…`)
   * paths — relative paths are resolved against `window.location.origin` at
   * click time so callers on a different page (e.g. a lesson row on the course
   * page) can hand us the lesson URL without touching `window` themselves.
   * When omitted, resolves to the current `window.location.href`.
   */
  url?: string
  className?: string
  ariaLabel?: string
}

export function ShareButton({ title, text, url, className, ariaLabel }: ShareButtonProps) {
  const t = useTranslations('courses')
  // Guard against rapid double-taps on mobile that would open the share sheet twice.
  const busyRef = useRef(false)

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // When this button is rendered inside a parent <a> / Link (e.g. a lesson
    // row card that navigates to the lesson URL), stop the click so the share
    // sheet opens instead of the parent navigating away.
    event.preventDefault()
    event.stopPropagation()
    if (busyRef.current) return
    busyRef.current = true
    try {
      const shareUrl = resolveShareUrl(url)
      if (!shareUrl) return

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url: shareUrl })
          return
        } catch (err) {
          // User dismissed the sheet — not an error, just stop.
          if (err instanceof Error && err.name === 'AbortError') return
          // Any other failure (NotAllowedError on insecure context, etc.): fall through to clipboard.
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success(t('linkCopied'))
      }
    } finally {
      busyRef.current = false
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel ?? t('share')}
      className={cn(
        'inline-flex items-center justify-center h-9 w-9 rounded-full',
        'bg-card border border-border shadow-elevation-1',
        'text-foreground hover:bg-muted transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <Share2 className="h-4 w-4" />
    </button>
  )
}

function resolveShareUrl(url: string | undefined): string {
  if (typeof window === 'undefined') return url ?? ''
  if (!url) return window.location.href
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return url
}
