'use client'

import { useRouter } from 'next/navigation'

export function NavigationBar() {
  const router = useRouter()

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-white/10"
      style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'var(--gradient-sky-purple)' }}
            >
              A
            </div>
            <span
              className="text-xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--gradient-sky-purple-alt)' }}
            >
              A-Guy
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-sky-600 transition">
              פיצ'רים
            </a>
            <a href="#comparison" className="text-gray-600 hover:text-sky-600 transition">
              השוואה
            </a>
            <a href="#simulation" className="text-gray-600 hover:text-sky-600 transition">
              סימולציה
            </a>
            <a href="#stats" className="text-gray-600 hover:text-sky-600 transition">
              סטטיסטיקות
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:block px-4 py-2 text-gray-700 hover:text-sky-600 font-medium transition">
              התחברות
            </button>
            <button
              onClick={() => router.push('/courses')}
              className="px-5 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-sky-500/25"
              style={{ background: 'var(--gradient-sky-purple)' }}
            >
              ניסיון חינם
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
