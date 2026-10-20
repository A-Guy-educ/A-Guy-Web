/**
 * @fileType component
 * @domain legal
 * @ai-summary Client renderer for the terms-of-service markdown. Same renderer
 * contract as PrivacyPolicyContent (ReactMarkdown + remark-gfm) so bold text,
 * headings, and the pricing table in the terms markdown all render correctly.
 */
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TermsOfServiceContentProps {
  content: string
}

export function TermsOfServiceContent({ content }: TermsOfServiceContentProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
