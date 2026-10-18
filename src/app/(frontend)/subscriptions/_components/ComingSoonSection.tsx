'use client'

import { Sparkles } from 'lucide-react'

import { useI18n, useTranslations } from '@/ui/web/providers/I18n'

export function ComingSoonSection() {
  const t = useTranslations('subscriptions')
  const { messages } = useI18n()
  const items = readItems(messages)
  if (items.length === 0) return null

  return (
    <section className="mt-section-md rounded-lg border border-dashed border-border bg-card/60 p-card-padding">
      <div className="flex items-center gap-content-gap-xs">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-heading-sm font-black text-card-foreground">{t('comingSoon.title')}</h2>
      </div>
      <ul className="mt-3 grid gap-content-gap-xs md:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-body-sm text-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function readItems(messages: Record<string, unknown>): string[] {
  const subscriptions = messages.subscriptions as Record<string, unknown> | undefined
  const comingSoon = subscriptions?.comingSoon as Record<string, unknown> | undefined
  const items = comingSoon?.items
  return Array.isArray(items) ? items.filter((f): f is string => typeof f === 'string') : []
}
