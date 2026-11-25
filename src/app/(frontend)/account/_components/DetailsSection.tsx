'use client'

import type { User } from '@/infra/types/content'
import { formatIsraeliPhone, isWhatsAppPlaceholderEmail } from '@/infra/whatsapp/phone'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Avatar, AvatarFallback } from '@/ui/web/components/avatar'

interface DetailsSectionProps {
  user: User
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function DetailsSection({ user }: DetailsSectionProps) {
  const t = useTranslations('auth.account')

  return (
    <div className="flex flex-col gap-content-gap">
      <div className="flex items-center gap-content-gap">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-heading-lg">{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div>
            <p className="text-body-sm text-muted-foreground">{t('name')}</p>
            <p className="text-body-md font-medium">{user.name || t('missing')}</p>
          </div>
        </div>
      </div>
      {user.verifiedPhone && (
        <div>
          <p className="text-body-sm text-muted-foreground">{t('me.phone')}</p>
          <p className="text-body-md font-medium" dir="ltr">
            {formatIsraeliPhone(user.verifiedPhone)}
          </p>
        </div>
      )}
      {!isWhatsAppPlaceholderEmail(user.email) && (
        <div>
          <p className="text-body-sm text-muted-foreground">{t('email')}</p>
          <p className="text-body-md font-medium">{user.email}</p>
        </div>
      )}
    </div>
  )
}
