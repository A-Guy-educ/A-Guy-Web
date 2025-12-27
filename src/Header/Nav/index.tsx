'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

interface HeaderNavProps {
  data: HeaderType
  userName?: string
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ data, userName }) => {
  const navItems = data?.navItems || []

  // Group navigation items by type
  const primaryLinks = navItems.slice(0, Math.ceil(navItems.length / 2))
  const secondaryLinks = navItems.slice(Math.ceil(navItems.length / 2))

  return (
    <nav className="flex gap-6 items-center">
      {/* User Greeting */}
      {userName && (
        <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
          <span className="text-sm text-muted-foreground">Welcome,</span>
          <span className="text-sm font-semibold">{userName}</span>
        </div>
      )}

      {/* Primary Navigation */}
      {primaryLinks.length > 0 && (
        <div className="flex gap-3 items-center">
          {primaryLinks.map(({ link }, i) => (
            <CMSLink key={i} {...link} appearance="link" />
          ))}
        </div>
      )}

      {/* Separator */}
      {primaryLinks.length > 0 && secondaryLinks.length > 0 && (
        <div className="h-6 w-px bg-border" />
      )}

      {/* Secondary Navigation */}
      {secondaryLinks.length > 0 && (
        <div className="flex gap-3 items-center">
          {secondaryLinks.map(({ link }, i) => (
            <CMSLink key={i} {...link} appearance="link" />
          ))}
        </div>
      )}

      {/* Separator before search */}
      {navItems.length > 0 && <div className="h-6 w-px bg-border" />}

      {/* Search */}
      <Link
        href="/search"
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Search"
      >
        <SearchIcon className="w-5 text-foreground" />
      </Link>
    </nav>
  )
}
