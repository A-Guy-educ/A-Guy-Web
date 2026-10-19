/**
 * Terms of Service page — static Hebrew תקנון served at /terms-of-service.
 *
 * @fileType page
 * @domain legal
 * @ai-summary Renders the terms of service markdown with Tailwind typography.
 * Linked from the global footer next to the privacy policy.
 */

import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/infra/utils/mergeOpenGraph'

import { TermsOfServiceContent } from './TermsOfServiceContent'
import {
  TERMS_OF_SERVICE_MARKDOWN,
  TERMS_OF_SERVICE_LAST_UPDATED,
} from './terms-of-service-content'

const PAGE_TITLE = 'תקנון שימוש'
const PAGE_DESCRIPTION =
  'תקנון השימוש של A-Guy — תנאי שימוש, רכישת מנויים, תשלומים, שדרוגים, ביטולים והחזרים.'

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | A-Guy`,
  description: PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    title: `${PAGE_TITLE} | A-Guy`,
    description: PAGE_DESCRIPTION,
  }),
}

export default function TermsOfServicePage() {
  return (
    <main
      className="container mx-auto max-w-3xl py-10 px-4"
      dir="rtl"
      lang="he"
      data-last-updated={TERMS_OF_SERVICE_LAST_UPDATED}
    >
      <TermsOfServiceContent content={TERMS_OF_SERVICE_MARKDOWN} />
    </main>
  )
}
