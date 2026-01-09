import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Toaster } from '@/components/ui/toaster'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode, headers } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { I18nProvider } from '@/providers/I18n'
import { defaultLocale, locales, type Locale } from '@/i18n/config'

async function getLocale(): Promise<string> {
  try {
    // Use the x-locale header set by middleware
    // This avoids DYNAMIC_SERVER_USAGE errors during static generation
    const headersList = await headers()
    const localeHeader = headersList.get('x-locale')

    if (localeHeader && locales.includes(localeHeader as Locale)) {
      return localeHeader
    }
  } catch (_error) {
    // During static generation, headers() is not available
    // Fall back to default locale
    // The middleware will handle locale detection at request time for dynamic pages
  }

  return defaultLocale
}

async function getMessages(locale: string) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default
  } catch {
    return (await import(`../../../messages/${defaultLocale}.json`)).default
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let isEnabled = false
  try {
    const draft = await draftMode()
    isEnabled = draft.isEnabled
  } catch {
    // During static generation, draftMode() is not available
  }

  const locale = await getLocale()
  const messages = await getMessages(locale)

  // Determine text direction based on locale
  const dir = locale === 'he' ? 'rtl' : 'ltr'

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      dir={dir}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <Providers>
            <AdminBar
              adminBarProps={{
                preview: isEnabled,
              }}
            />
            <Header />
            {children}
            <Footer />
            <Toaster />
          </Providers>
        </I18nProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
