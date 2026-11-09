'use client'

import { toast } from 'sonner'

import type { NotebookCheckDebug } from '@/infra/types/notebook'

export type NotebookCheckTrace = NotebookCheckDebug & { inkImage: string }

const IMAGE_CLASS = 'max-h-48 w-full rounded-md border border-border bg-background object-contain'
const LABEL_CLASS = 'font-medium text-foreground'
const BLOCK_CLASS = 'whitespace-pre-wrap break-words rounded-md bg-muted p-2'

/**
 * What the last notebook check actually sent and got back. The server only
 * includes this for admins, and it is internal tooling, so it isn't translated.
 */
export function CheckDebugPanel({ trace }: { trace: NotebookCheckTrace }) {
  const { inkImage: _inkImage, ...copyable } = trace
  const copy = () => {
    navigator.clipboard
      .writeText(JSON.stringify(copyable, null, 2))
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('Could not copy'))
  }

  return (
    <details className="rounded-lg border border-border bg-card p-3 text-body-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground">
        Check debug: {trace.verdict ?? 'no verdict'}
      </summary>
      <div className="mt-3 space-y-3" dir="ltr">
        <div className="grid grid-cols-2 gap-content-gap-xs">
          <figure>
            <figcaption className={LABEL_CLASS}>Exercise sent</figcaption>
            {trace.exerciseUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- debug view of a blob-hosted cut
              <img src={trace.exerciseUrl} alt="Exercise sent" className={IMAGE_CLASS} />
            ) : (
              <p>None (blank page)</p>
            )}
          </figure>
          <figure>
            <figcaption className={LABEL_CLASS}>Handwriting sent</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
            <img src={trace.inkImage} alt="Handwriting sent" className={IMAGE_CLASS} />
          </figure>
        </div>
        <p>
          <span className={LABEL_CLASS}>Model read: </span>
          {trace.reading ?? '(no transcription returned)'}
        </p>
        <p>
          {trace.model} · temperature {trace.temperature} · {trace.durationMs} ms ·{' '}
          {trace.inputTokens} in / {trace.outputTokens} out / {trace.thoughtsTokens} thinking ·
          stopped: {trace.finishReason ?? 'unknown'} · {trace.traceId}
        </p>
        <details>
          <summary className="cursor-pointer">Raw reply</summary>
          <pre className={BLOCK_CLASS}>{trace.rawReply}</pre>
        </details>
        <details>
          <summary className="cursor-pointer">Prompt</summary>
          <pre className={BLOCK_CLASS}>{`${trace.system}\n\n${trace.prompt}`}</pre>
        </details>
        <button type="button" onClick={copy} className="underline hover:text-foreground">
          Copy as JSON
        </button>
      </div>
    </details>
  )
}
