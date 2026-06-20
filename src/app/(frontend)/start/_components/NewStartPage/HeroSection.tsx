'use client'

import { useRouter } from 'next/navigation'

interface HeroSectionProps {
  onScrollToSimulation: () => void
}

export function HeroSection({ onScrollToSimulation }: HeroSectionProps) {
  const router = useRouter()

  return (
    <section
      className="min-h-screen flex items-center relative overflow-hidden pt-16"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent-sky) 20%, transparent)' }}
        />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent-purple) 20%, transparent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent-sky) 5%, transparent)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Text */}
          <div className="text-white space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border border-white/10">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm">AI Tutor זמין 24/7</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
              למידה פרטית
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'var(--gradient-sky-purple-alt)' }}
              >
                {' '}
                בעידן ה-AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-surface-gray-300 leading-relaxed max-w-xl">
              מורה פרטי AI שמכיר את החוזקות והחולשות שלך, מתאים את עצמו לקצב הלמידה שלך, ונותן משוב
              מיידי — בכל שעה, בכל יום.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/courses')}
                className="group px-8 py-4 bg-white text-sky-700 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all flex items-center gap-2"
              >
                <span>התחל ניסיון חינם</span>
                <svg
                  className="w-5 h-5 group-hover:-translate-x-1 transition"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
              <button
                onClick={onScrollToSimulation}
                className="px-8 py-4 backdrop-blur-xl text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition flex items-center gap-2 border border-white/20"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>צפה בהדגמה</span>
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex gap-2">
                {['יש', 'מע', 'דנ', 'רו'].map((name, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: [
                        'var(--gradient-pink)',
                        'var(--gradient-indigo-purple)',
                        'var(--gradient-green)',
                        'var(--gradient-amber)',
                      ][i],
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
              <div className="text-surface-gray-300 text-sm">
                <span className="font-bold text-white">+2,500</span> תלמידים כבר משתמשים
              </div>
            </div>
          </div>

          {/* Hero Visual — Mini Chat Interface */}
          <div className="relative">
            <div className="relative z-10 animate-float">
              <div className="backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl bg-white/10">
                {/* Chat header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: 'var(--gradient-sky-purple)' }}
                  >
                    A
                  </div>
                  <div>
                    <div className="text-white font-semibold">A-Guy Tutor</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-green-400 text-xs">Online</span>
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="space-y-4">
                  <div className="rounded-2xl rounded-tr-sm p-4 bg-white/10">
                    <p className="text-surface-gray-200 text-sm">
                      שלום! אני A-Guy. איך אוכל לעזור לך במתמטיקה היום?
                    </p>
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-sm p-4"
                    style={{ background: 'var(--gradient-sky-purple)' }}
                  >
                    <p className="text-white text-sm">
                      אני מתקשה בפונקציות - לא מבין מתי להשתמש בנגזרת
                    </p>
                  </div>
                  <div className="rounded-2xl rounded-tr-sm p-4 bg-white/10">
                    <p className="text-surface-gray-200 text-sm">
                      בוא נבין יחד! 🔍
                      <br />
                      <br />
                      <strong className="text-white">דוגמה:</strong> אם f(x) מתארת מרחק, הנגזרת
                      f'(x) מתארת את המהירות.
                      <br />
                      <br />
                      רוצה שאסביר עם עוד דוגמאות?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent-sky) 30%, transparent)' }}
            />
            <div
              className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-xl"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-purple) 30%, transparent)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center">
          <div className="w-1.5 h-3 bg-white/50 rounded-full mt-2 animate-bounce" />
        </div>
      </div>
    </section>
  )
}
