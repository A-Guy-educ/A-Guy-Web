/**
 * Team page — static Hebrew "about us" page served at /team.
 *
 * @fileType page
 * @domain marketing
 * @ai-summary Header + grid of team-member cards that open a profile dialog.
 * All copy and member data live in `team-content.ts`. Linked from the global
 * footer.
 */

import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/infra/utils/mergeOpenGraph'

import { TeamGrid } from './_components/TeamGrid'
import { TEAM_MEMBERS, TEAM_PAGE_COPY } from './team-content'

export const metadata: Metadata = {
  title: `${TEAM_PAGE_COPY.metaTitle} | A-Guy`,
  description: TEAM_PAGE_COPY.metaDescription,
  openGraph: mergeOpenGraph({
    title: `${TEAM_PAGE_COPY.metaTitle} | A-Guy`,
    description: TEAM_PAGE_COPY.metaDescription,
  }),
}

export default function TeamPage() {
  return (
    <main className="relative overflow-hidden" dir="rtl" lang="he">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/15 via-accent/15 to-transparent blur-3xl"
      />

      <div className="container relative mx-auto max-w-7xl px-5 py-section-lg sm:px-8 sm:py-section-xl lg:px-12">
        <header className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <div
            dir="ltr"
            className="mb-5 inline-flex items-center gap-content-gap-xs.5 rounded-full border border-border bg-card px-4 py-1.5 font-mono text-body-xs tracking-wider text-primary-text"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-pulse"
            />
            <span>{TEAM_PAGE_COPY.badge}</span>
          </div>
          <h1 className="mb-5 text-display-sm font-extrabold tracking-tight text-foreground sm:text-display-md lg:text-display-lg">
            {TEAM_PAGE_COPY.titleLead}{' '}
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              {TEAM_PAGE_COPY.titleHighlight}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-body-lg font-light leading-relaxed text-muted-foreground">
            {TEAM_PAGE_COPY.intro}
          </p>
        </header>

        <TeamGrid members={TEAM_MEMBERS} />

        <p className="mt-16 border-t border-border pt-8 text-center text-body-sm text-muted-foreground">
          {TEAM_PAGE_COPY.hint}
        </p>
      </div>
    </main>
  )
}
