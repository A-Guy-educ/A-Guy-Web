/**
 * Drag/drop handoff from the course search composer into the /ask page.
 *
 * Dropped files go to `onFileDrop` (the composer suggests lessons for a photo
 * first). `uploadFile` uploads an image or PDF to /api/media, creates a fresh
 * Ask conversation scoped to the current course, parks the uploaded media
 * (and the typed question, if any) on `sessionStorage`, and navigates to
 * `/ask?chat=<id>&ctx=<ctx>`. `AskPrimaryContent` reads the parked media on
 * mount and dispatches the restore event the rest of the Ask page already
 * understands — same code path as resuming an existing conversation.
 *
 * @fileType hook
 * @domain frontend
 */
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/infra/utils/logger'
import { writeAskPendingQuestion } from '@/client/state/sessionStorage/askPendingQuestion'
import {
  getAskPendingMediaKey,
  type AskPendingMediaPayload,
} from '@/app/(frontend)/ask/_components/ask-types'

interface Options {
  courseId: string
  /** Called with a dropped file; the composer decides whether it goes to Ask. */
  onFileDrop: (file: File) => void
  /** Toast / inline label when the drop isn't an image/pdf. */
  invalidTypeLabel: string
  /** Toast when the upload/handoff fails. */
  failureLabel: string
}

interface DropState {
  isUploading: boolean
  isDragOver: boolean
}

function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (file.type === 'application/pdf') return true
  // Some browsers (Safari, Windows Explorer drag) omit the MIME type on
  // dropped files, so fall back to the extension.
  return /\.pdf$/i.test(file.name)
}

async function createAskConversation(courseId: string) {
  const convRes = await fetch('/api/conversations/by-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ courseId }),
  })
  if (!convRes.ok) throw new Error(`conversation create failed: ${convRes.status}`)
  return (await convRes.json()) as { id: string; contextKey: string }
}

export function useCourseComposerDropToAsk({
  courseId,
  onFileDrop,
  invalidTypeLabel,
  failureLabel,
}: Options) {
  const router = useRouter()
  const [state, setState] = useState<DropState>({ isUploading: false, isDragOver: false })
  // Nested dragenter/leave events fire on child elements; counting keeps the
  // drag-over state stable instead of flickering as the pointer crosses the
  // composer's inner textarea / chip row.
  const dragDepth = useRef(0)

  const uploadAndNavigate = useCallback(
    async (file: File, question?: string) => {
      if (!courseId) return
      if (!isAcceptedFile(file)) {
        toast.error(invalidTypeLabel)
        return
      }
      setState({ isUploading: true, isDragOver: false })

      try {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/media', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!uploadRes.ok) throw new Error(`upload failed: ${uploadRes.status}`)
        const doc = await uploadRes.json()
        const mediaId: string | undefined = doc.doc?.id || doc.id
        const filename: string = doc.doc?.filename || doc.filename || file.name
        const url: string = doc.doc?.url || doc.url || ''
        const mimeType: string =
          file.type ||
          (filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
        if (!mediaId) throw new Error('upload response missing mediaId')

        const { id, contextKey } = await createAskConversation(courseId)

        const payload: AskPendingMediaPayload = { mediaId, filename, mimeType, url }
        window.sessionStorage.setItem(getAskPendingMediaKey(contextKey), JSON.stringify(payload))
        if (question) writeAskPendingQuestion(contextKey, question)

        router.push(`/ask?chat=${id}&ctx=${encodeURIComponent(contextKey)}`)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        logger.error({ err }, 'CourseComposer drop-to-ask failed')
        toast.error(failureLabel)
        setState({ isUploading: false, isDragOver: false })
      }
    },
    [courseId, failureLabel, invalidTypeLabel, router],
  )

  /** Text-only handoff: open a fresh Ask room with the question prefilled. */
  const openAskWithQuestion = useCallback(
    async (question: string) => {
      if (!courseId) return
      setState({ isUploading: true, isDragOver: false })
      try {
        const { id, contextKey } = await createAskConversation(courseId)
        writeAskPendingQuestion(contextKey, question)
        router.push(`/ask?chat=${id}&ctx=${encodeURIComponent(contextKey)}`)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        logger.error({ err }, 'CourseComposer ask handoff failed')
        toast.error(failureLabel)
        setState({ isUploading: false, isDragOver: false })
      }
    },
    [courseId, failureLabel, router],
  )

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    dragDepth.current += 1
    setState((prev) => ({ ...prev, isDragOver: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) {
      setState((prev) => ({ ...prev, isDragOver: false }))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer?.files?.length) return
      e.preventDefault()
      dragDepth.current = 0
      onFileDrop(e.dataTransfer.files[0])
    },
    [onFileDrop],
  )

  return {
    isUploading: state.isUploading,
    isDragOver: state.isDragOver,
    dropHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    // Same path as drop, exposed for the mobile `+` file-picker button
    // where drag-and-drop isn't available.
    uploadFile: uploadAndNavigate,
    openAskWithQuestion,
  }
}
