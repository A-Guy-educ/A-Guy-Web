/**
 * @fileType component
 * @domain frontend
 * @pattern footer-client
 * @ai-summary Static footer: brand logo, Terms + Privacy links, version, theme
 * selector, copyright. The admin-driven nav / meta / legal-modal flow was
 * removed — authored footer content in the Payload "Footer" global is no
 * longer rendered. Keep this file lean; any new footer item should be a
 * literal link here, not another CMS lookup.
 */
'use client'

import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'
import { BrandLogo } from '@/ui/web/BrandLogo'
import { ThemeSelector } from '@/ui/web/providers/Theme/ThemeSelector'

interface FooterClientProps {
  version: string
  /**
   * Render the bottom row (version, theme selector). Kept on so it matches the
   * existing footer behavior; can be flipped off in tests.
   */
  showExtras?: boolean
}

export const FooterClient: React.FC<FooterClientProps> = ({ version, showExtras = true }) => {
  const tLegal = useTranslations('legal')
  const tFooter = useTranslations('footer')

  return (
    <footer className="mt-auto border-t border-border bg-footer text-card-foreground relative z-0">
      <div className="container py-3 flex flex-row flex-wrap items-center justify-center gap-content-gap-xs">
        <SystemLink className="flex items-center" href="/">
          <BrandLogo className="h-5 w-auto" />
        </SystemLink>

        <div className="flex flex-wrap justify-center min-w-0 items-center gap-content-gap-xs text-body-xs">
          <SystemLink
            href="/terms-of-service"
            data-testid="footer-terms-of-service"
            className="text-card-foreground hover:text-primary transition-all duration-normal text-body-xs whitespace-nowrap"
          >
            {tLegal('termsOfService')}
          </SystemLink>

          <SystemLink
            href="/privacy-policy"
            data-testid="footer-privacy-policy"
            className="text-card-foreground hover:text-primary transition-all duration-normal text-body-xs whitespace-nowrap"
          >
            {tLegal('privacyPolicy')}
          </SystemLink>

          {showExtras ? (
            <>
              <span className="text-muted-foreground/30">|</span>
              <span className="text-body-xs text-muted-foreground/70 font-normal">v{version}</span>
              <ThemeSelector />
            </>
          ) : null}
        </div>
      </div>

      <div className="container pb-3 pt-1 text-center text-body-xs text-muted-foreground/70">
        {tFooter('copyright')}
      </div>
    </footer>
  )
}
