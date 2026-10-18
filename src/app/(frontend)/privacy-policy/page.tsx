/**
 * Privacy Policy page — static Hebrew policy served at /privacy-policy.
 *
 * @fileType page
 * @domain legal
 * @ai-summary Renders the privacy policy markdown with Tailwind typography.
 * Linked from the global footer.
 */

import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/infra/utils/mergeOpenGraph'

import { PrivacyPolicyContent } from './PrivacyPolicyContent'
import { PRIVACY_POLICY_MARKDOWN, PRIVACY_POLICY_LAST_UPDATED } from './privacy-policy-content'

const PAGE_TITLE = 'מדיניות הפרטיות'
const PAGE_DESCRIPTION =
  'מדיניות הפרטיות של A-Guy — איזה מידע נאסף, לאילו מטרות הוא משמש וזכויות המשתמשים.'

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | A-Guy`,
  description: PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    title: `${PAGE_TITLE} | A-Guy`,
    description: PAGE_DESCRIPTION,
  }),
}

export default function PrivacyPolicyPage() {
  return (
    <main
      className="container mx-auto max-w-3xl py-10 px-4"
      dir="rtl"
      lang="he"
      data-last-updated={PRIVACY_POLICY_LAST_UPDATED}
    >
      <PrivacyPolicyContent content={PRIVACY_POLICY_MARKDOWN} />
    </main>
  )
}
