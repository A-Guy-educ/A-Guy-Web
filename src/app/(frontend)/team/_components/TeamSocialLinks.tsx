/**
 * @fileType component
 * @domain marketing
 * @ai-summary Round LinkedIn / GitHub / email buttons for a team member.
 * Renders only the links that are filled in, and nothing when none are.
 */
import { Github, Linkedin, Mail } from 'lucide-react'

import type { TeamMember } from '../team-content'
import { TEAM_PAGE_COPY } from '../team-content'

const LINK_CLASS =
  'flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors duration-normal hover:border-primary/40 hover:bg-primary/10 hover:text-primary-text'

export function hasTeamMemberLinks(member: TeamMember): boolean {
  const { linkedin, github, email } = member.links
  return Boolean(linkedin || github || email)
}

export function TeamSocialLinks({ member }: { member: TeamMember }) {
  const { linkedin, github, email } = member.links
  if (!hasTeamMemberLinks(member)) return null

  return (
    <div className="flex items-center gap-content-gap-xs">
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`LinkedIn – ${member.name}`}
          className={LINK_CLASS}
        >
          <Linkedin aria-hidden className="h-4 w-4" />
        </a>
      ) : null}
      {github ? (
        <a
          href={github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`GitHub – ${member.name}`}
          className={LINK_CLASS}
        >
          <Github aria-hidden className="h-4 w-4" />
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          aria-label={`${TEAM_PAGE_COPY.emailLabel} – ${member.name}`}
          className={LINK_CLASS}
        >
          <Mail aria-hidden className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  )
}
