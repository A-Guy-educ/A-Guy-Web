import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Payload Starter',
  description: 'A production-ready Payload CMS + Next.js starter template',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
