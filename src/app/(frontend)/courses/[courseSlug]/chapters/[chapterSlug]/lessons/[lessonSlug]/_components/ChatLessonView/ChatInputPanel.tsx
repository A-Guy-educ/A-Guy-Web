'use client'

import { uploadFileAsMedia } from '@/infra/media/uploadDataUrl'
import { logger } from '@/infra/utils/logger'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { FormulaComposer } from '@/ui/web/shared/MathInput/FormulaComposer'
import { AnimatePresence, motion } from 'framer-motion'
import { FileUp, FunctionSquare, Image as ImageIcon, Loader2, Plus, Send, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

interface ChatInputPanelProps {
  disabled?: boolean
  isSending: boolean
  placeholder: string
  sendLabel: string
  /**
   * Uploaded media ids arrive in the second arg; when it's empty the send is
   * a plain text message. The parent (`ChatLessonRunnerView`) forwards this
   * straight to `useChatChannel.send`, which now accepts an optional
   * `mediaIds` array.
   */
  onSubmit: (text: string, mediaIds: string[]) => void
}

interface UploadItem {
  localId: string
  file: File
  status: 'uploading' | 'complete' | 'failed'
  mediaId?: string
  error?: string
}

const MAX_ATTACHMENTS = 5
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

export function ChatInputPanel({
  disabled,
  isSending,
  placeholder,
  sendLabel,
  onSubmit,
}: ChatInputPanelProps) {
  const t = useTranslations('courses')
  const [value, setValue] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUploading = uploads.some((u) => u.status === 'uploading')
  const hasFailedUpload = uploads.some((u) => u.status === 'failed')
  const completedMediaIds = uploads
    .filter((u): u is UploadItem & { mediaId: string } => u.status === 'complete' && !!u.mediaId)
    .map((u) => u.mediaId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled || isSending || isUploading || hasFailedUpload) return
    onSubmit(trimmed, completedMediaIds)
    setValue('')
    setUploads([])
    setComposerOpen(false)
  }

  const handleFormulaInsert = useCallback(
    (latex: string) => {
      const el = inputRef.current
      const start = el?.selectionStart ?? value.length
      const end = el?.selectionEnd ?? value.length
      const wrapped = `$${latex}$`
      setValue(value.substring(0, start) + wrapped + value.substring(end))
      setComposerOpen(false)
      requestAnimationFrame(() => {
        const caret = start + wrapped.length
        el?.focus()
        el?.setSelectionRange(caret, caret)
      })
    },
    [value],
  )

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      // Compute the batch + fire uploads OUTSIDE setUploads. React 18 StrictMode
      // double-invokes state updaters in dev; if we scheduled uploads from
      // inside the updater we'd upload each file twice and leak orphan media
      // docs for the losing invocation whose localIds never landed in state.
      const remaining = MAX_ATTACHMENTS - uploads.length
      if (remaining <= 0) return
      const nextItems: UploadItem[] = Array.from(files)
        .slice(0, remaining)
        .map((file) => ({
          localId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          status: 'uploading',
        }))
      setUploads((prev) => [...prev, ...nextItems])
      for (const item of nextItems) {
        uploadFileAsMedia(item.file)
          .then((mediaId) =>
            setUploads((cur) =>
              cur.map((u) =>
                u.localId === item.localId ? { ...u, status: 'complete', mediaId } : u,
              ),
            ),
          )
          .catch((err: unknown) => {
            logger.error({ err }, 'Chat attachment upload failed')
            setUploads((cur) =>
              cur.map((u) =>
                u.localId === item.localId
                  ? {
                      ...u,
                      status: 'failed',
                      error: err instanceof Error ? err.message : 'Failed',
                    }
                  : u,
              ),
            )
          })
      }
    },
    [uploads.length],
  )

  const removeUpload = useCallback((localId: string) => {
    setUploads((cur) => cur.filter((u) => u.localId !== localId))
  }, [])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'absolute bottom-0 inset-x-0 z-30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden',
        'bg-gradient-to-t from-background via-background/92 to-transparent',
        'pointer-events-none',
      )}
    >
      <div className="max-w-2xl mx-auto relative pointer-events-auto" dir="rtl" data-math-controls>
        {uploads.length > 0 && (
          <div className="flex flex-wrap gap-content-gap-xs mb-2">
            {uploads.map((u) => (
              <div
                key={u.localId}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm border',
                  u.status === 'complete' && 'border-success/30 bg-success/10',
                  u.status === 'failed' && 'border-destructive/30 bg-destructive/10',
                  u.status === 'uploading' && 'border-border bg-muted',
                )}
              >
                {u.file.type.startsWith('image/') ? (
                  <ImageIcon
                    className={cn(
                      'w-4 h-4',
                      u.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  />
                ) : (
                  <FileUp
                    className={cn(
                      'w-4 h-4',
                      u.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  />
                )}
                <span className="max-w-[120px] truncate text-foreground">{u.file.name}</span>
                {u.status === 'uploading' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
                {u.status === 'failed' && (
                  <span className="text-body-xs text-destructive" title={u.error}>
                    {u.error || 'Failed'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeUpload(u.localId)}
                  className="p-0.5 hover:bg-destructive/20 rounded-full transition-colors"
                  aria-label={t('chatRemoveFile')}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            'flex items-center gap-content-gap-xs px-3 py-1.5 rounded-full',
            'bg-card/95 backdrop-blur-md border border-border shadow-card',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isSending}
            dir="rtl"
            className={cn(
              'flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-1',
              'text-body-md text-foreground placeholder:text-muted-foreground',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          />

          {!disabled && (
            <button
              type="button"
              onClick={() => setComposerOpen((v) => !v)}
              aria-label={t('insertFormula')}
              title={t('insertFormula')}
              className={cn(
                'w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90',
                'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
              )}
            >
              <FunctionSquare className="w-4 h-4" />
            </button>
          )}

          {!disabled && (
            <>
              <button
                type="button"
                onClick={openFilePicker}
                disabled={uploads.length >= MAX_ATTACHMENTS}
                aria-label={t('chatAttachFile')}
                title={t('chatAttachFile')}
                className={cn(
                  'w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90',
                  'bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </>
          )}

          <button
            type="submit"
            disabled={disabled || isSending || isUploading || hasFailedUpload || !value.trim()}
            aria-label={sendLabel}
            className={cn(
              'w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90',
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-elevation-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {composerOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-full inset-x-0 mb-2"
              data-math-controls
            >
              <FormulaComposer
                onInsert={handleFormulaInsert}
                onClose={() => setComposerOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
