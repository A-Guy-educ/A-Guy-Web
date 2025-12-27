import { NextRequest, NextResponse } from 'next/server'
import { cookieName, defaultLocale, type Locale, locales } from './src/i18n/config'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host') || ''

  // Exclude paths from locale handling
  const shouldExclude =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')

  if (shouldExclude) {
    return NextResponse.next()
  }

  let locale: Locale = defaultLocale
  let shouldSetCookie = false

  // Check for subdomain-based locale forcing
  if (host.startsWith('he.')) {
    locale = 'he'
    shouldSetCookie = true
  } else if (host.startsWith('en.')) {
    locale = 'en'
    shouldSetCookie = true
  } else {
    // On primary domain, check cookie first
    const cookieLocale = request.cookies.get(cookieName)?.value as Locale | undefined

    if (cookieLocale && locales.includes(cookieLocale)) {
      locale = cookieLocale
    } else {
      // Fallback to Accept-Language header
      const acceptLanguage = request.headers.get('accept-language')
      if (acceptLanguage) {
        const preferredLocale = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() as
          | Locale
          | undefined

        if (preferredLocale && locales.includes(preferredLocale)) {
          locale = preferredLocale
          shouldSetCookie = true
        }
      }
    }
  }

  const response = NextResponse.next()

  // Set locale cookie if needed
  if (shouldSetCookie) {
    response.cookies.set(cookieName, locale, {
      maxAge: 31536000, // 1 year
      path: '/',
      sameSite: 'lax',
    })
  }

  // Set locale header for next-intl
  response.headers.set('x-locale', locale)

  return response
}

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - /api routes
    // - /_next (Next.js internals)
    // - /_static (inside /public)
    // - all items with a file extension
    '/((?!api|_next|_static|.*\\..*).*)',
  ],
}
