'use client'

import { ChevronRight } from 'lucide-react'

import { useSubscriptionsHref } from '@/client/hooks/useSubscriptionsHref'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import type { TierSlug } from '@/lib/tiers/constants'
import { DropdownMenuItem } from '@/ui/web/components/dropdown-menu'
import { useTranslations } from '@/ui/web/providers/I18n'

interface AccountPlanCardProps {
  tier: TierSlug
  usagePercent: number | null
}

export function AccountPlanCard({ tier, usagePercent }: AccountPlanCardProps) {
  const t = useTranslations('common.header')
  const tPlans = useTranslations('subscriptions')
  const subscribeHref = useSubscriptionsHref()

  return (
    <div className="mb-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-bold">{t('mySubscription')}</span>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-body-xs font-bold text-primary">
          {tPlans(`tiers.${tier}.name`)}
        </span>
      </div>
      {usagePercent !== null && (
        <div className="mt-3">
          <div className="mb-2 flex justify-between text-body-xs text-muted-foreground">
            <span>{t('budgetUsed')}</span>
            <span className="font-bold">{usagePercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
      )}
      {tier !== 'premium' && (
        <DropdownMenuItem asChild>
          <SystemLink
            href={subscribeHref}
            className="mt-3 flex items-center justify-between rounded-lg bg-background text-body-xs font-bold text-primary"
          >
            {t('moreOptions')}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </SystemLink>
        </DropdownMenuItem>
      )}
    </div>
  )
}
