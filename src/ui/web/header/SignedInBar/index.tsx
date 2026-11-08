'use client'

import { ChevronRight } from 'lucide-react'

import { useSubscriptionsHref } from '@/client/hooks/useSubscriptionsHref'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import type { User } from '@/infra/types/content'
import { getUserTierSlug } from '@/lib/tiers'
import { BrandLogo } from '@/ui/web/BrandLogo'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'
import { UserDropdown } from '@/ui/web/UserDropdown'
import { ExamCountdownLink } from './ExamCountdownLink'
import { NotebookComingSoon } from './NotebookComingSoon'

export function SignedInBar({ user }: { user: User }) {
  const t = useTranslations('common.header')
  const tPlans = useTranslations('subscriptions')
  const subscribeHref = useSubscriptionsHref()
  const tier = getUserTierSlug(user as { currentTier?: string | null })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-content-gap-xs md:gap-content-gap">
      <div className="flex min-w-0 items-center gap-content-gap-xs justify-self-start md:gap-content-gap">
        <SystemLink
          href="/"
          className="flex-shrink-0 transition-opacity hover:opacity-80"
          aria-label={t('home')}
        >
          <BrandLogo className="h-9 w-auto md:h-11" />
        </SystemLink>
        <div className="hidden h-8 w-px bg-border md:block" aria-hidden />
        <div className="hidden flex-col whitespace-nowrap leading-tight md:flex">
          <span className="text-body-xs text-muted-foreground">{t('myPlan')}</span>
          <span className="text-body-sm font-bold">{tPlans(`tiers.${tier}.name`)}</span>
        </div>
        {tier !== 'premium' && (
          <Button size="sm" asChild className="whitespace-nowrap">
            <SystemLink href={subscribeHref}>
              {t('upgrade')}
              <ChevronRight className="hidden h-4 w-4 sm:block rtl:rotate-180" aria-hidden />
            </SystemLink>
          </Button>
        )}
      </div>

      <ExamCountdownLink courseId={user.courseSelection?.courseId} />

      <div className="flex items-center gap-content-gap-xs justify-self-end">
        <NotebookComingSoon />
        <UserDropdown user={user} />
      </div>
    </div>
  )
}
