'use client'

import Link from 'next/link'

import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'

/** Shown instead of a lesson the student's class teacher hasn't opened. */
export function HiddenLessonNotice({ courseSlug }: { courseSlug: string }) {
  const t = useTranslations('coursePage.hiddenLesson')

  return (
    <div className="container py-section-lg flex flex-col items-center justify-center text-center">
      <h1 className="text-display-sm font-bold mb-2">{t('title')}</h1>
      <p className="text-body-lg text-muted-foreground mb-8">{t('message')}</p>
      <Button asChild variant="default">
        <Link href={`/courses/${courseSlug}`}>{t('back')}</Link>
      </Button>
    </div>
  )
}
