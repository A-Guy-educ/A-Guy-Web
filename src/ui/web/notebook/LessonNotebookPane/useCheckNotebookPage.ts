'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

import type { NotebookPage } from '@/infra/types/notebook'
import { flattenPageInk } from '@/ui/web/notebook/LessonNotebook'
import { useTranslations } from '@/ui/web/providers/I18n'

/**
 * "Check this page": hand the page's handwriting and its cut exercise to the
 * tutor through the same `ask-action` check the floating notebook uses, so
 * the chat's existing check prompt (student work + original exercise) applies.
 */
export function useCheckNotebookPage() {
  const t = useTranslations('courses.lessonNotebook')

  return useCallback(
    (page: NotebookPage, inks: readonly string[]) => {
      const imageData = flattenPageInk(page, inks)
      if (!imageData || !page.strokes.length) {
        toast.info(t('nothingToCheck'))
        return
      }
      window.dispatchEvent(
        new CustomEvent('ask-action', {
          detail: {
            type: 'check',
            title: page.cut?.source.label ?? t('blankPage'),
            imageData,
            mediaId: page.cut?.mediaId,
          },
        }),
      )
    },
    [t],
  )
}
