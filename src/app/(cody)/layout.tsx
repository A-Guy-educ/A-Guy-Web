/**
 * @fileType layout
 * @domain cody
 * @pattern route-group
 * @ai-summary Root layout for Cody dashboard route group - provides html/body and client providers
 */
import React from 'react'

import { CodyProviders } from './CodyProviders'
import '@/app/(frontend)/globals.css'

export default function CodyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark' || theme === 'light') {
                  document.documentElement.setAttribute('data-theme', theme);
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <CodyProviders>
          <div className="min-h-screen bg-background text-foreground">{children}</div>
        </CodyProviders>
      </body>
    </html>
  )
}
