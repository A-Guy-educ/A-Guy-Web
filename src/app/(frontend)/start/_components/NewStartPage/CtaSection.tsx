'use client'

import { useRouter } from 'next/navigation'

export function CtaSection() {
  const router = useRouter()

  return (
    <section className="py-24" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">מוכן להתחיל?</h2>
        <p className="text-xl text-surface-gray-300 mb-10 max-w-2xl mx-auto">
          הצטרף לאלפי תלמידים שכבר משתמשים ב-A-Guy ומשפרים את הציונים שלהם
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => router.push('/courses')}
            className="px-10 py-5 text-white rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center gap-2"
            style={{
              background: 'var(--gradient-blue-purple-deep)',
              boxShadow: '0 10px 25px color-mix(in srgb, var(--accent-sky) 25%, transparent)',
            }}
          >
            <span>התחל ניסיון חינם</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
          <button
            onClick={() => router.push('/courses')}
            className="px-10 py-5 bg-white text-surface-gray-900 rounded-2xl font-bold text-lg border-2 border-surface-gray-200 hover:border-sky-500 transition flex items-center gap-2"
          >
            <span>מסלולים והרשמה</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
