/**
 * @fileType component
 * @domain marketing
 * @ai-summary Responsive grid of team cards (1 / 2 / 4 columns) plus the
 * profile dialog. Keeps the last opened member mounted while the dialog
 * animates closed so its content doesn't blank out mid-transition.
 */
'use client'

import { useState } from 'react'

import type { TeamMember } from '../team-content'
import { TeamMemberCard } from './TeamMemberCard'
import { TeamMemberDialog } from './TeamMemberDialog'

interface TeamGridProps {
  members: readonly TeamMember[]
}

export function TeamGrid({ members }: TeamGridProps) {
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openMember = (member: TeamMember) => {
    setActiveMember(member)
    setIsOpen(true)
  }

  return (
    <>
      <section
        aria-label="חברי הצוות"
        className="grid grid-cols-1 gap-content-gap-lg sm:grid-cols-2 lg:grid-cols-4"
      >
        {members.map((member) => (
          <TeamMemberCard key={member.id} member={member} onOpen={openMember} />
        ))}
      </section>
      <TeamMemberDialog member={activeMember} open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
