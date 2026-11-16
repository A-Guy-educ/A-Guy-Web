'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  ChatUpgradeOffer,
  NOTEBOOK_QUOTA_OFFER_EVENT,
  type NotebookQuotaOfferDetail,
} from '@/ui/web/chat/ChatUpgradeOffer'
import type { QuotaOfferReason } from '@/ui/web/chat/hooks/useNotebookChat'
import { useTranslations } from '@/ui/web/providers/I18n'

/**
 * Popup with the upgrade offer, opened when a notebook page check is turned
 * away for quota (the chat announces it — see `NOTEBOOK_QUOTA_OFFER_EVENT`).
 * A plain portal overlay rather than a Radix dialog: picking a plan opens
 * `UpgradeCheckoutDialog`, a fixed overlay that a transformed Radix content
 * box would trap.
 */
export function NotebookQuotaPopup() {
  const t = useTranslations('upgradeDialog')
  const [reason, setReason] = useState<QuotaOfferReason | null>(null)

  useEffect(() => {
    const onOffer = (e: Event) =>
      setReason((e as CustomEvent<NotebookQuotaOfferDetail>).detail.reason)
    window.addEventListener(NOTEBOOK_QUOTA_OFFER_EVENT, onOffer)
    return () => window.removeEventListener(NOTEBOOK_QUOTA_OFFER_EVENT, onOffer)
  }, [])

  if (!reason) return null
  const close = () => setReason(null)

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-foreground/40 p-card-padding-sm backdrop-blur-sm animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-card">
        <button
          type="button"
          onClick={close}
          aria-label={t('close')}
          className="absolute end-3 top-3 z-10 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <ChatUpgradeOffer source="notebook" reason={reason} onContinue={close} />
      </div>
    </div>,
    document.body,
  )
}
