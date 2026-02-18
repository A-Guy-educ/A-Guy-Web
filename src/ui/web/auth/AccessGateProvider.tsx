'use client'

import { useAccessGate } from '@/client/hooks/useAccessGate'
import type { AccessType } from '@/server/constants/access-types'
import { useTranslations } from '@/ui/web/providers/I18n'
import { usePathname } from 'next/navigation'

import { AuthGateModal } from './AuthGateModal'
import { GatedWarningBanner } from './GatedWarningBanner'

interface AccessGateProviderProps {
  accessType: AccessType | string
  courseSlug: string
  children: React.ReactNode
}

export function AccessGateProvider({ accessType, courseSlug, children }: AccessGateProviderProps) {
  const t = useTranslations('accessControl')
  const pathname = usePathname()
  const { showMandatoryModal, showGatedModal, showWarningBanner, warningSecondsLeft } =
    useAccessGate({ accessType, courseSlug })

  const handleSignIn = () => {
    window.location.href = `/api/oauth/google?returnTo=${encodeURIComponent(pathname)}`
  }

  const isBlocked = showMandatoryModal || showGatedModal

  return (
    <>
      {showWarningBanner && (
        <GatedWarningBanner secondsRemaining={warningSecondsLeft} onSignIn={handleSignIn} />
      )}

      <AuthGateModal
        isOpen={showMandatoryModal}
        title={t('mandatoryTitle')}
        description={t('mandatoryDescription')}
        returnTo={pathname}
      />

      <AuthGateModal
        isOpen={showGatedModal}
        title={t('gatedLockedTitle')}
        description={t('gatedLockedDescription')}
        returnTo={pathname}
      />

      {isBlocked ? (
        <div aria-hidden="true" className="pointer-events-none select-none blur-sm">
          {children}
        </div>
      ) : (
        children
      )}
    </>
  )
}
