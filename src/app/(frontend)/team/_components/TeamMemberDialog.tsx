/**
 * @fileType component
 * @domain marketing
 * @ai-summary Full-profile dialog for a team member: avatar, tags, full bio,
 * quote, focus areas and links. Forces RTL because the dialog portals out of
 * the page's RTL <main>.
 */
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'

import type { TeamMember } from '../team-content'
import { TEAM_PAGE_COPY } from '../team-content'
import { TeamAvatar } from './TeamAvatar'
import { TeamCodeTag, TeamRoleTag } from './TeamMemberTags'
import { hasTeamMemberLinks, TeamSocialLinks } from './TeamSocialLinks'

interface TeamMemberDialogProps {
  member: TeamMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamMemberDialog({ member, open, onOpenChange }: TeamMemberDialogProps) {
  return (
    <Dialog open={open && member !== null} onOpenChange={onOpenChange}>
      {member ? (
        <DialogContent
          dir="rtl"
          lang="he"
          data-testid="team-member-dialog"
          className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl sm:rounded-3xl sm:p-9"
        >
          <DialogHeader className="flex-col items-center gap-content-gap-lg space-y-0 text-center sm:flex-row sm:text-start">
            <TeamAvatar name={member.name} image={member.image} size="dialog" />
            <div className="flex-1">
              <div className="mb-2.5 flex flex-wrap items-center justify-center gap-content-gap-xs sm:justify-start">
                <TeamCodeTag code={member.code} />
                <TeamRoleTag role={member.role} />
              </div>
              {/* Size only: `cn` reads `text-display-sm` as a colour, so adding a
                  colour class here would drop the size. */}
              <DialogTitle className="text-display-sm">{member.name}</DialogTitle>
            </div>
          </DialogHeader>

          <DialogDescription className="leading-relaxed">{member.fullBio}</DialogDescription>

          <blockquote className="rounded-2xl border-s-2 border-primary bg-muted/40 px-5 py-3 text-body-sm italic leading-relaxed text-foreground">
            {member.quote}
          </blockquote>

          <div>
            <h3 className="mb-3 text-body-xs font-medium text-muted-foreground">
              {TEAM_PAGE_COPY.focusAreasLabel}
            </h3>
            <ul className="flex flex-wrap gap-content-gap-xs">
              {member.focusAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-body-xs font-medium text-primary-text"
                >
                  {area}
                </li>
              ))}
            </ul>
          </div>

          {hasTeamMemberLinks(member) ? (
            <div className="flex items-center justify-between border-t border-border pt-5">
              <span className="text-body-xs text-muted-foreground">
                {TEAM_PAGE_COPY.linksLabel}
              </span>
              <TeamSocialLinks member={member} />
            </div>
          ) : null}
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
