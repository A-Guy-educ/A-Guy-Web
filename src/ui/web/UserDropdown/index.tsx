'use client'

import { useState, type ComponentType } from 'react'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  LogOut,
  Store,
  User as UserIcon,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/web/components/dropdown-menu'
import { AccentPicker } from '@/ui/web/components/accent-picker'
import { LanguageSwitcher } from '@/ui/web/LanguageSwitcher'
import { UserAvatar } from '@/ui/web/UserAvatar'
import { useTranslations } from '@/ui/web/providers/I18n'
import { logoutUser } from '@/client/auth/logout'
import { releaseUserStorage } from '@/client/state/localStorage/userScopedStorage'
import { analytics } from '@/infra/analytics'
import type { User } from '@/infra/types/content'
import { getUserTierSlug } from '@/lib/tiers'
import { AccountPlanCard } from './AccountPlanCard'
import { useMonthlyTokenUsagePercent } from './useMonthlyTokenUsagePercent'

const SECTION_LABEL = 'px-2 pb-1 pt-2 text-body-xs font-bold text-muted-foreground'

interface AccountMenuLinkProps {
  href: string
  icon: ComponentType<{ className?: string }>
  label: string
}

function AccountMenuLink({ href, icon: Icon, label }: AccountMenuLinkProps) {
  return (
    <DropdownMenuItem asChild>
      <SystemLink href={href} className="flex min-h-[44px] items-center gap-content-gap-xs">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
        <ChevronRight className="ms-auto h-4 w-4 text-muted-foreground/60 rtl:rotate-180" />
      </SystemLink>
    </DropdownMenuItem>
  )
}

export function UserDropdown({ user }: { user: User }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // The language list portals here so picking one doesn't count as an outside click.
  const [menuNode, setMenuNode] = useState<HTMLDivElement | null>(null)
  const t = useTranslations('common.header')
  const usagePercent = useMonthlyTokenUsagePercent(isOpen)
  const tier = getUserTierSlug(user as { currentTier?: string | null })

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      analytics.reset()
      await logoutUser()
      releaseUserStorage()
      window.dispatchEvent(new Event('auth:changed'))
      router.push('/login')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        data-testid="user-dropdown"
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('openAccountMenu')}
      >
        <UserAvatar name={user.name || 'User'} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={setMenuNode}
        align="end"
        sideOffset={8}
        className="w-[min(358px,calc(100vw-24px))] rounded-2xl p-3"
      >
        <AccountPlanCard tier={tier} usagePercent={usagePercent} />

        <DropdownMenuLabel className={SECTION_LABEL}>{t('myLearning')}</DropdownMenuLabel>
        <AccountMenuLink href="/stats" icon={BarChart3} label={t('myProgress')} />
        <AccountMenuLink href="/study-plan" icon={CalendarDays} label={t('nextExam')} />
        <AccountMenuLink href="/courses" icon={Store} label={t('courseShop')} />

        <DropdownMenuSeparator />
        <DropdownMenuLabel className={SECTION_LABEL}>{t('myAccount')}</DropdownMenuLabel>
        <AccountMenuLink href="/account" icon={UserIcon} label={t('personalDetails')} />

        <DropdownMenuLabel className={SECTION_LABEL}>{t('settings')}</DropdownMenuLabel>
        <div className="flex flex-col gap-content-gap-xs px-2 py-1">
          <span className="text-body-sm">{t('systemColor')}</span>
          <AccentPicker />
          <span className="mt-1 text-body-sm">{t('language')}</span>
          <LanguageSwitcher portalContainer={menuNode} />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="min-h-[44px] text-destructive focus:text-destructive"
        >
          <LogOut className="me-2 h-4 w-4" />
          {isLoggingOut ? t('loggingOut') : t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
