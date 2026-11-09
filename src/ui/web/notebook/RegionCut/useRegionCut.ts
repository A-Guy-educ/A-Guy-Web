'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { dataUrlToFile, uploadDataUrlAsMediaDoc } from '@/infra/media/uploadDataUrl'
import { attachFilesToChat } from '@/ui/web/chat/attach-files-event'
import {
  NOTEBOOK_MAX_PAGE_HEIGHT,
  NOTEBOOK_PAGE_WIDTH,
  type NotebookCut,
  type NotebookCutSource,
  type NotebookPage,
} from '@/infra/types/notebook'
import { logger } from '@/infra/utils/logger'
import { useTranslations } from '@/ui/web/providers/I18n'
import { NEW_PAGE_HEIGHT } from '../LessonNotebook/useNotebookPages'
import type { CutTarget, ViewportBox } from './CutSelection'
import type { CapturedRegion } from './pdf-region-capture'

/** Room left under a cut exercise for the solution. */
const SOLVING_SPACE = 800

interface RegionCutOptions {
  /** Read the selected pixels; `null` when that part of the material is not readable. */
  capture: (selection: ViewportBox) => Promise<CapturedRegion | null>
  /** Where cuts come from; the PDF page and rectangle are filled in per cut. */
  source: Omit<NotebookCutSource, 'page' | 'rect'>
  addPage: (cut: NotebookCut, height: number) => Promise<NotebookPage>
  onAddedToNotebook: (page: NotebookPage) => void
  onSentToChat: () => void
}

/** Initial page height for a cut: the exercise at full page width, plus room to solve. */
export function pageHeightForCut(width: number, height: number): number {
  const imageHeight = Math.round((NOTEBOOK_PAGE_WIDTH * height) / width)
  return Math.min(NOTEBOOK_MAX_PAGE_HEIGHT, Math.max(NEW_PAGE_HEIGHT, imageHeight + SOLVING_SPACE))
}

/**
 * Turns a selection on the lesson material into an uploaded image, then
 * either a new notebook page or a chat attachment. Upload happens once,
 * before the branch, so both targets reference the same stored cut.
 */
export function useRegionCut({
  capture,
  source,
  addPage,
  onAddedToNotebook,
  onSentToChat,
}: RegionCutOptions) {
  const t = useTranslations('courses.lessonNotebook')
  const [busy, setBusy] = useState(false)

  const cut = useCallback(
    async (target: CutTarget, selection: ViewportBox) => {
      setBusy(true)
      try {
        const region = await capture(selection)
        if (!region) {
          toast.error(t('cutUnavailable'))
          return
        }

        const extension = region.dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png'
        const filename = `notebook-cut${region.page ? `-p${region.page}` : ''}.${extension}`

        // The chat uploads its own attachments; the cut goes into the composer
        // as a regular attachment chip for the student to send with a question.
        if (target === 'chat') {
          attachFilesToChat([dataUrlToFile(region.dataUrl, filename)])
          onSentToChat()
          return
        }

        const media = await uploadDataUrlAsMediaDoc(region.dataUrl, filename)

        const page = await addPage(
          {
            mediaId: media.id,
            url: media.url,
            width: region.width,
            height: region.height,
            source: { ...source, page: region.page, rect: region.pageRect },
          },
          pageHeightForCut(region.width, region.height),
        )
        onAddedToNotebook(page)
      } catch (err) {
        logger.error({ err }, '[notebook] Cut failed')
        toast.error(t('cutFailed'))
      } finally {
        setBusy(false)
      }
    },
    [capture, source, addPage, onAddedToNotebook, onSentToChat, t],
  )

  return { busy, cut }
}
