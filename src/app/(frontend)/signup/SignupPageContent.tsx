'use client'

import React from 'react'
import { useTranslations } from '@/ui/web/providers/I18n'
import { SignupForm } from './SignupForm'

export function SignupPageContent() {
  const t = useTranslations('auth.signup')

  return (
    <div className="container py-section-md">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-display-sm font-bold mb-2">{t('title')}</h1>
          <p className="text-body-md text-muted-foreground">{t('subtitle')}</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
