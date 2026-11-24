/**
 * @fileType component
 * @domain marketing
 * @ai-summary One team-member card. The "profile" button stretches over the
 * whole card (::after overlay) so any click opens the dialog, while the
 * social links sit above the overlay and stay independently clickable.
 */
import type { TeamMember } from '../team-content'
import { TEAM_PAGE_COPY } from '../team-content'
import { TeamAvatar } from './TeamAvatar'
import { TeamCodeTag, TeamRoleTag } from './TeamMemberTags'
import { TeamSocialLinks } from './TeamSocialLinks'

interface TeamMemberCardProps {
  member: TeamMember
  onOpen: (member: TeamMember) => void
}

export function TeamMemberCard({ member, onOpen }: TeamMemberCardProps) {
  return (
    <article
      data-testid={`team-card-${member.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-slow hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-card-hover"
    >
      <div className="flex flex-col items-center px-6 pb-4 pt-7 text-center">
        <div className="mb-5">
          <TeamCodeTag code={member.code} />
        </div>
        <div className="mb-5">
          <TeamAvatar name={member.name} image={member.image} size="card" />
        </div>
        <h2 className="mb-1.5 text-heading-lg text-foreground transition-colors duration-normal group-hover:text-primary-text">
          {member.name}
        </h2>
        <div className="mb-4">
          <TeamRoleTag role={member.role} />
        </div>
        <p className="text-body-sm leading-relaxed text-muted-foreground">{member.shortBio}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-section-xs">
        <div className="relative z-10">
          <TeamSocialLinks member={member} />
        </div>
        <button
          type="button"
          onClick={() => onOpen(member)}
          aria-label={`${TEAM_PAGE_COPY.profileCta} – ${member.name}`}
          className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-body-xs font-medium text-muted-foreground transition-colors duration-normal after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary-text"
        >
          <span>{TEAM_PAGE_COPY.profileCta}</span>
          <span
            aria-hidden
            className="transition-transform duration-slow group-hover:-translate-x-1"
          >
            &larr;
          </span>
        </button>
      </div>
    </article>
  )
}
