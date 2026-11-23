'use client'

import { PageTransition } from '@/ui/web/components/page-transition'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Zap } from 'lucide-react'

import { StudyPlanPanel } from './StudyPlanPanel'

export function StudyPlanPage() {
  const t = useTranslations('studyPlan')

  return (
    <PageTransition>
      <div className="min-h-screen bg-background py-section-sm px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warning/10 rounded-xl mb-4">
              <Zap className="w-6 h-6 text-warning" />
            </div>
            <h1 className="text-heading-xl font-bold text-foreground mb-2">{t('pageTitle')}</h1>
            <p className="text-muted-foreground">{t('pageSubtitle')}</p>
          </div>

          <StudyPlanPanel />
        </div>
      </div>
    </PageTransition>
  )
}
