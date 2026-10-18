/**
 * @fileType component
 * @domain legal
 * @ai-summary Client renderer for the privacy policy markdown. Kept client-side
 * so react-markdown's plugin chain runs in the browser without hitting any
 * server-component serialisation edge cases.
 */
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PrivacyPolicyContentProps {
  content: string
}

export function PrivacyPolicyContent({ content }: PrivacyPolicyContentProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
