import { Rubik } from 'next/font/google'
import type { ReactNode } from 'react'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['500', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
})

// The school walkthrough shares /newclass's Hebrew-only, light-only look, so it
// pins its own direction and palette regardless of the visitor's locale/theme.
export default function ClassDemoLayout({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      lang="he"
      className={`${rubik.variable} min-h-screen bg-nc-ground text-start font-nc-body leading-[1.5] text-nc-ink [color-scheme:light]`}
    >
      {children}
    </div>
  )
}
