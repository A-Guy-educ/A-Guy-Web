'use client'

import { Sparkles } from 'lucide-react'

/**
 * Placeholder shown while the /api/agent/chat request is in flight. Kept
 * deliberately chrome-less (no teacher header, no speak button) so a
 * still-pending message can't be interacted with as if it were a real
 * assistant reply. Amber tone signals "the tutor is thinking".
 */
export function PendingBubble() {
  return (
    <div className="flex items-start gap-content-gap-xs" aria-live="polite" aria-label="…">
      <div
        className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-elevation-1 mt-0.5"
        aria-hidden="true"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tr-md border border-warning/30 bg-warning/10 px-4 py-3 shadow-elevation-1">
        <span className="w-2 h-2 rounded-full bg-warning animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-warning animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-warning animate-bounce" />
      </div>
    </div>
  )
}
