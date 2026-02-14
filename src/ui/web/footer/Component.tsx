import { getCachedGlobal } from '@/infra/utils/getGlobals'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import React from 'react'

import type { Footer } from '@/payload-types'

import { ThemeSelector } from '@/ui/web/providers/Theme/ThemeSelector'
import { CMSLink } from '@/ui/web/Link'
import { TelescopeLogo } from '@/ui/web/TelescopeLogo'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Read version directly from package.json
 */
async function getVersion(): Promise<string> {
  try {
    const packageJson = await readFile(join(process.cwd(), 'package.json'), 'utf-8')
    const { version } = JSON.parse(packageJson)
    return version || 'dev'
  } catch {
    return 'dev'
  }
}

/**
 * Minimal version display for public footer
 * Matches admin page styling: 12px, subtle color
 */
function VersionDisplay({ version }: { version: string }) {
  return (
    <span className="text-xs text-muted-foreground/70 font-normal" style={{ fontSize: '12px' }}>
      v{version}
    </span>
  )
}

export async function Footer() {
  const footerData: Footer = await getCachedGlobal('footer', 1)()
  const version = await getVersion()

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto border-t border-border bg-footer text-card-foreground relative z-0">
      <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-between">
        <SystemLink className="flex items-center" href="/">
          <TelescopeLogo className="h-8 w-auto" />
        </SystemLink>

        <div className="flex flex-col-reverse items-start md:flex-row gap-4 md:items-center">
          <ThemeSelector />
          <nav className="flex flex-col md:flex-row gap-4 items-center">
            {navItems.map(({ link }, i) => {
              return (
                <CMSLink
                  className="text-card-foreground hover:text-primary transition-colors"
                  key={i}
                  {...link}
                />
              )
            })}
            <span className="hidden md:inline-block mx-2 text-muted-foreground/30">|</span>
            <VersionDisplay version={version} />
          </nav>
        </div>
      </div>
    </footer>
  )
}
