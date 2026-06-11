'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/* =========================================================
   NEW START PAGE — Issue #159
   Complete redesign based on provided HTML mockup.
   All text is Hebrew (RTL). Design matches HTML exactly.
   ========================================================= */

const ONBOARDING_STEPS = [
  {
    q: 'איך A-Guy שונה ממורה פרטי?',
    a: 'A-Guy זמין 24/7, עונה מיידית, ולומד את דפוס הטעויות שלך כדי להתאים הסברים בדיוק לרמה שלך — בעלות של פיצה אחת בחודש.',
  },
  {
    q: 'איך מתחילים?',
    a: 'פשוט לוחצים על "התחל ניסיון חינם", בוחרים נושא, ומתחילים לשאול שאלות. אין צורך בהתקנה או ידע טכני.',
  },
  {
    q: 'האם המערכת בטוחה?',
    a: 'בהחלט! כל הנתונים מוצפנים, אנחנו לא שומרים מידע אישי, והמערכת עומדת בתקנות הגנת הפרטיות.',
  },
]

type TabName = 'dashboard' | 'chat' | 'notebook'

export function NewStartPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabName>('dashboard')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [simulationMessages, setSimulationMessages] = useState<
    Array<{ role: 'user' | 'ai'; text: string }>
  >([])
  const [simulationInput, setSimulationInput] = useState('')

  // Hide header/footer for immersive full-page experience
  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => {
      document.body.classList.remove('landing-page')
    }
  }, [])

  const scrollToSimulation = () => {
    document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSimulationSend = () => {
    const text = simulationInput.trim()
    if (!text) return
    setSimulationMessages((prev) => [...prev, { role: 'user', text }])
    setSimulationInput('')
    // Simulate AI response
    setTimeout(() => {
      setSimulationMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'תודה על השאלה! 🤔 אני אשמח לעזור. הקלד עוד פרטים או שאלה ספציפית יותר, ואענה לך בדיוק על מה שאתה צריך.',
        },
      ])
    }, 800)
  }

  const handleSimulationKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSimulationSend()
  }

  const handleOnboardingNext = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep((s) => s + 1)
    } else {
      setShowOnboarding(false)
    }
  }

  const handleOnboardingPrev = () => {
    if (onboardingStep > 0) setOnboardingStep((s) => s - 1)
  }

  return (
    <>
      {/* Float keyframe for hero animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboarding-bubble {
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      <div className="bg-gray-50 text-gray-900 overflow-x-hidden min-h-screen" dir="rtl">
        {/* ================================================
          NAVIGATION
      ================================================ */}
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
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                >
                  A
                </div>
                <span
                  className="text-xl font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #0ea5e9, #9333ea)' }}
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
                  onClick={() => router.push('/start')}
                  className="px-5 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-sky-500/25"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                >
                  ניסיון חינם
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ================================================
          HERO SECTION
      ================================================ */}
        <section
          className="min-h-screen flex items-center relative overflow-hidden pt-16"
          style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #1e3a8a 50%, #312e81 100%)' }}
        >
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-20 right-20 w-72 h-72 rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(14,165,233,0.2)' }}
            />
            <div
              className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(14,165,233,0.05)' }}
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
                    style={{ backgroundImage: 'linear-gradient(135deg, #0ea5e9, #9333ea)' }}
                  >
                    {' '}
                    בעידן ה-AI
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                  מורה פרטי AI שמכיר את החוזקות והחולשות שלך, מתאים את עצמו לקצב הלמידה שלך, ונותן
                  משוב מיידי — בכל שעה, בכל יום.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={scrollToSimulation}
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
                  <button className="px-8 py-4 backdrop-blur-xl text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition flex items-center gap-2 border border-white/20">
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
                            'linear-gradient(135deg, #f472b6, #e11d48)',
                            'linear-gradient(135deg, #60a5fa, #6366f1)',
                            'linear-gradient(135deg, #4ade80, #22c55e)',
                            'linear-gradient(135deg, #fbbf24, #f97316)',
                          ][i],
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                  <div className="text-gray-300 text-sm">
                    <span className="font-bold text-white">+2,500</span> תלמידים כבר משתמשים
                  </div>
                </div>
              </div>

              {/* Hero Visual — Mini Chat Interface */}
              <div className="relative">
                <div
                  className="relative z-10"
                  style={{
                    animation: 'float 3s ease-in-out infinite',
                  }}
                >
                  <div
                    className="backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {/* Chat header */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
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
                      <div
                        className="rounded-2xl rounded-tr-sm p-4"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                      >
                        <p className="text-gray-200 text-sm">
                          שלום! אני A-Guy. איך אוכל לעזור לך במתמטיקה היום?
                        </p>
                      </div>
                      <div
                        className="rounded-2xl rounded-tl-sm p-4"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                      >
                        <p className="text-white text-sm">
                          אני מתקשה בפונקציות - לא מבין מתי להשתמש בנגזרת
                        </p>
                      </div>
                      <div
                        className="rounded-2xl rounded-tr-sm p-4"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                      >
                        <p className="text-gray-200 text-sm">
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
                  style={{ backgroundColor: 'rgba(14,165,233,0.3)' }}
                />
                <div
                  className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-xl"
                  style={{ backgroundColor: 'rgba(168,85,247,0.3)' }}
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

        {/* ================================================
          COMPARISON SECTION
      ================================================ */}
        <section id="comparison" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                למה{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #0ea5e9, #9333ea)' }}
                >
                  A-Guy
                </span>{' '}
                עדיף?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                השוואה בין חוויית הלמידה עם A-Guy לבין הלמידה המסורתית
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Traditional */}
              <div
                className="rounded-3xl p-8 border-2 border-gray-100 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: '#f9fafb' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700">הלמידה המסורתית</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'מורה זמין רק בשעות מוגבלות',
                    'עלות גבוהה - 150-300₪ לשיעור',
                    'המתנה ימים עד שאלה מקבלת מענה',
                    'קצב למידה אחיד לכולם',
                    'חומר לימוד סטטי וישן',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* A-Guy */}
              <div
                className="rounded-3xl p-8 border-2 border-sky-200 relative overflow-hidden transition-all hover:scale-[1.02]"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(168,85,247,0.05))',
                }}
              >
                <div
                  className="absolute top-4 left-4 px-3 py-1 text-white text-xs font-bold rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                >
                  מומלץ
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3
                    className="text-2xl font-bold bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #0ea5e9, #9333ea)' }}
                  >
                    עם A-Guy
                  </h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'זמין 24/7 — שאל כשאתה צריך',
                    'עלות חודשית קבועה וזולה משמעותית',
                    'מענה מיידי — תוך שניות',
                    'מותאם אישית לקצב שלך',
                    'חומר עדכני עם AI שמתפתח',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================
          STATS SECTION
      ================================================ */}
        <section
          id="stats"
          className="py-20 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0284c7, #9333ea)' }}
        >
          <div className="absolute inset-0">
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { num: '20+', label: 'שיעורים מוכנים' },
                { num: '50K+', label: 'תרגילים' },
                { num: '100K+', label: 'תלמידים' },
                { num: 'AI 24/7', label: 'זמינות מלאה' },
              ].map((stat) => (
                <div key={stat.num} className="text-center">
                  <div className="text-4xl sm:text-5xl font-black text-white mb-2">{stat.num}</div>
                  <div className="text-white/80 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
          FEATURES SECTION
      ================================================ */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                פיצ'רים שמשנים את הלמידה
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                טכנולוגיה מתקדמת שמותאמת לסגנון הלמידה שלך
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all hover:-translate-y-2 hover:shadow-lg"
                  style={{ '--delay': `${feature.delay}ms` } as React.CSSProperties}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                    style={{ background: feature.gradient }}
                  >
                    <feature.Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================
          TABS SECTION
      ================================================ */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                נראה איך זה נראה
              </h2>
              <p className="text-xl text-gray-600">3 חלונות — כל מה שאתה צריך במקום אחד</p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex justify-center mb-8">
              <div
                className="inline-flex gap-1 p-1.5 rounded-2xl"
                style={{ backgroundColor: '#f3f4f6' }}
              >
                {(
                  [
                    { id: 'dashboard', label: '📊 Dashboard' },
                    { id: 'chat', label: "💬 צ'אט" },
                    { id: 'notebook', label: '📓 מחברת' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={
                      activeTab === tab.id
                        ? { background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }
                        : {}
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="max-w-4xl mx-auto">
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div
                  className="rounded-3xl p-8 border border-gray-200"
                  style={{ backgroundColor: '#f9fafb' }}
                >
                  <div className="grid md:grid-cols-3 gap-6 mb-6">
                    {[
                      {
                        title: 'התקדמות כללית',
                        value: '78%',
                        bar: 78,
                        color: 'linear-gradient(135deg, #0ea5e9, #a855f7)',
                      },
                      {
                        title: 'תרגילים החודש',
                        value: '142',
                        change: '↑ 23% מהחודש שעבר',
                        color: '#22c55e',
                      },
                      { title: 'שעות למידה', value: '24.5', sub: 'החודש', color: '#f59e0b' },
                    ].map((card) => (
                      <div key={card.title} className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="text-sm text-gray-500 mb-1">{card.title}</div>
                        <div className="text-3xl font-bold text-gray-900 mb-2">{card.value}</div>
                        {'bar' in card ? (
                          <div
                            className="w-full h-2 rounded-full"
                            style={{ backgroundColor: '#e5e7eb' }}
                          >
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${card.bar}%`, background: card.color }}
                            />
                          </div>
                        ) : (
                          <div
                            className="text-sm"
                            style={{
                              color:
                                'change' in card && card.change?.startsWith('↑')
                                  ? '#22c55e'
                                  : '#6b7280',
                            }}
                          >
                            {'change' in card ? card.change : card.sub}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Focus Topics */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4">נושאים בפוקוס</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'פונקציות', pct: 85, color: '#0ea5e9' },
                        { name: 'גזירה', pct: 62, color: '#a855f7' },
                        { name: 'אינטגרציה', pct: 34, color: '#f59e0b' },
                      ].map((topic) => (
                        <div key={topic.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-700">{topic.name}</span>
                            <span className="text-sm font-medium" style={{ color: topic.color }}>
                              {topic.pct}%
                            </span>
                          </div>
                          <div
                            className="w-full h-2 rounded-full"
                            style={{ backgroundColor: '#e5e7eb' }}
                          >
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${topic.pct}%`, background: topic.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div
                  className="rounded-3xl border border-gray-200 overflow-hidden"
                  style={{ backgroundColor: '#f9fafb' }}
                >
                  <div
                    className="p-4"
                    style={{ background: 'linear-gradient(135deg, #0284c7, #9333ea)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                      >
                        <span className="text-white font-bold">A</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold">A-Guy Tutor</div>
                        <div className="text-white/70 text-sm">מומחה למתמטיקה</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4 min-h-[300px]">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                      <p className="text-gray-700">היי! איך אפשר לעזור לך היום בלימודים?</p>
                    </div>
                    <div
                      className="rounded-2xl rounded-tr-sm p-4 max-w-[80%] mr-auto"
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                    >
                      <p className="text-white">איך פותרים אינטגרל של פונקציה מעריכית?</p>
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                      <p className="text-gray-700">
                        מצוין! 🧮
                        <br />
                        <br />
                        הנה הנוסחה הבסיסית:
                        <br />
                        <br />
                        <strong>∫eˣ dx = eˣ + C</strong>
                        <br />
                        <br />
                        ולפונקציות כלליות:
                        <br />
                        <strong>∫eᵘ du = eᵘ + C</strong>
                        <br />
                        <br />
                        רוצה שאראה דוגמה מפורטת?
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border-t">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="שאל שאלה..."
                        className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 text-right"
                        style={
                          {
                            backgroundColor: '#f3f4f6',
                            '--tw-ring-color': '#0ea5e9',
                          } as React.CSSProperties
                        }
                      />
                      <button
                        className="px-6 py-3 text-white rounded-xl font-medium transition shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                      >
                        שלח
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notebook Tab */}
              {activeTab === 'notebook' && (
                <div
                  className="rounded-3xl border border-gray-200 overflow-hidden"
                  style={{ backgroundColor: '#f9fafb' }}
                >
                  <div className="bg-gray-100 p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: '#f87171' }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: '#fbbf24' }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: '#34d399' }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">המחברת שלי</span>
                    <button className="text-sky-600 text-sm font-medium">+ הוסף דף</button>
                  </div>
                  <div className="p-6 space-y-4">
                    {[
                      {
                        date: '15 בינואר 2025',
                        topic: 'אינטגרלים',
                        color: 'sky',
                        items: ['∫x² dx = x³/3 + C', '∫sin(x) dx = -cos(x) + C'],
                      },
                      {
                        date: '14 בינואר 2025',
                        topic: 'גזירה',
                        color: 'purple',
                        items: ['d/dx(xⁿ) = nxⁿ⁻¹', 'שרשרת הנגזרות - דוגמה: f(g(x))'],
                      },
                    ].map((note) => (
                      <div
                        key={note.topic}
                        className="rounded-xl p-4 border"
                        style={{
                          backgroundColor:
                            note.color === 'sky'
                              ? 'rgba(14,165,233,0.05)'
                              : 'rgba(168,85,247,0.05)',
                          borderColor:
                            note.color === 'sky' ? 'rgba(14,165,233,0.2)' : 'rgba(168,85,247,0.2)',
                        }}
                      >
                        <div
                          className="text-xs font-medium mb-1"
                          style={{ color: note.color === 'sky' ? '#0284c7' : '#9333ea' }}
                        >
                          📅 {note.date}
                        </div>
                        <h4 className="font-bold text-gray-900 mb-2">נושא: {note.topic}</h4>
                        <div className="text-gray-700 text-sm space-y-1">
                          {note.items.map((item, i) => (
                            <p key={i}>{item}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div
                      className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: 'rgba(245,158,11,0.05)',
                        borderColor: 'rgba(245,158,11,0.2)',
                      }}
                    >
                      <div className="text-xs font-medium mb-1" style={{ color: '#b45309' }}>
                        ⭐ הערה חשובה
                      </div>
                      <p className="text-gray-700 text-sm">לכל קבוע ביטוי (C) יש נגזרת 0</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================
          SIMULATION SECTION
      ================================================ */}
        <section
          id="simulation"
          className="py-24 text-white relative overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          <div className="absolute inset-0">
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(14,165,233,0.1)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl"
              style={{ backgroundColor: 'rgba(168,85,247,0.1)' }}
            />
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">נסה את A-Guy עכשיו</h2>
              <p className="text-xl text-gray-400">הקלד שאלה וקבל תשובה מיידית</p>
            </div>

            <div
              className="rounded-3xl p-8 border backdrop-blur-xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              {/* Messages area */}
              <div className="space-y-4 mb-6 min-h-[200px]">
                {simulationMessages.length === 0 ? (
                  <div className="flex gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                    >
                      A
                    </div>
                    <div
                      className="rounded-2xl rounded-tl-sm p-4 flex-1"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <p className="text-gray-200">הקלד שאלה במתמטיקה ואני אעזור לך!</p>
                    </div>
                  </div>
                ) : (
                  simulationMessages.map((msg, i) =>
                    msg.role === 'user' ? (
                      <div key={i} className="flex gap-3 justify-end">
                        <div
                          className="rounded-2xl rounded-tr-sm p-4 max-w-[70%]"
                          style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                        >
                          <p className="text-white">{msg.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                          style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                        >
                          A
                        </div>
                        <div
                          className="rounded-2xl rounded-tl-sm p-4 flex-1"
                          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        >
                          <p className="text-gray-200">{msg.text}</p>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <input
                  id="simulation-input"
                  type="text"
                  value={simulationInput}
                  onChange={(e) => setSimulationInput(e.target.value)}
                  onKeyDown={handleSimulationKey}
                  placeholder="למשל: איך פותרים משוואה ריבועית?"
                  className="flex-1 px-5 py-4 rounded-2xl border focus:outline-none text-white placeholder-gray-400 text-right"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                />
                <button
                  onClick={handleSimulationSend}
                  className="px-8 py-4 text-white rounded-2xl font-bold transition-all shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                >
                  שלח
                </button>
              </div>

              {/* Quick questions */}
              <div className="flex flex-wrap gap-2 mt-4">
                {['איך פותרים משוואה ריבועית?', 'מהי נגזרת?', 'הסבר את משפט פיתגורס'].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setSimulationInput(q)
                      scrollToSimulation()
                    }}
                    className="px-4 py-2 rounded-xl text-sm text-gray-300 transition hover:bg-white/20"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================
          FINAL CTA SECTION
      ================================================ */}
        <section
          className="py-24"
          style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">מוכן להתחיל?</h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              הצטרף לאלפי תלמידים שכבר משתמשים ב-A-Guy ומשפרים את הציונים שלהם
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={scrollToSimulation}
                className="px-10 py-5 text-white rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #9333ea)',
                  boxShadow: '0 10px 25px rgba(14,165,233,0.25)',
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
                onClick={() => router.push('/start')}
                className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-bold text-lg border-2 border-gray-200 hover:border-sky-500 transition flex items-center gap-2"
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

        {/* ================================================
          FOOTER
      ================================================ */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                >
                  A
                </div>
                <span className="text-white font-bold">A-Guy</span>
              </div>
              <div className="flex gap-6 text-sm">
                <a href="#" className="hover:text-white transition">
                  תנאי שימוש
                </a>
                <a href="#" className="hover:text-white transition">
                  פרטיות
                </a>
                <a href="#" className="hover:text-white transition">
                  צור קשר
                </a>
              </div>
              <div className="text-sm">© 2025 A-Guy. כל הזכויות שמורות.</div>
            </div>
          </div>
        </footer>

        {/* ================================================
          ONBOARDING OVERLAY
      ================================================ */}
        {showOnboarding && (
          <div id="onboarding-overlay" className="fixed bottom-6 left-6 z-50 max-w-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div
                className="p-4"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <span className="text-white font-bold text-sm">A</span>
                    </div>
                    <span className="text-white font-semibold">A-Guy מזמין אותך</span>
                  </div>
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="text-white/80 hover:text-white transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    שאלה {onboardingStep + 1} מתוך {ONBOARDING_STEPS.length}
                  </span>
                </div>
                <div
                  className="rounded-xl p-3 border"
                  style={{
                    backgroundColor: 'rgba(14,165,233,0.05)',
                    borderColor: 'rgba(14,165,233,0.2)',
                  }}
                >
                  <p className="text-sky-700 font-medium text-sm">
                    ❓ {ONBOARDING_STEPS[onboardingStep].q}
                  </p>
                </div>
                <div
                  className="rounded-xl p-3 border"
                  style={{
                    backgroundColor: 'rgba(168,85,247,0.05)',
                    borderColor: 'rgba(168,85,247,0.2)',
                  }}
                >
                  <p className="text-purple-700 text-sm">💡 {ONBOARDING_STEPS[onboardingStep].a}</p>
                </div>
              </div>

              {/* Navigation */}
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={handleOnboardingPrev}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    onboardingStep === 0 ? 'hidden' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ← הקודם
                </button>
                <button
                  onClick={handleOnboardingNext}
                  className="flex-1 px-4 py-2 text-white rounded-xl text-sm font-medium transition shadow-md"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)' }}
                >
                  {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'סיום ✓' : 'הבא →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* =========================================================
   FEATURE DATA
   ========================================================= */

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

function IconLightbulb({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  )
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  )
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )
}

const FEATURES = [
  {
    title: "צ'אט אינטראקטיבי",
    desc: 'שואל שאלות בכל רגע ומקבל הסברים מותאמים לרמה שלך. לא רק תשובות — גם הבנה.',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    Icon: IconChat,
    delay: 0,
  },
  {
    title: 'זיהוי פערי ידע',
    desc: 'המערכת מזהה בדיוק איפה אתה מתקשה ויוצר מסלול לימוד מותאם לסגור את הפערים.',
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    Icon: IconLightbulb,
    delay: 100,
  },
  {
    title: 'תרגול ממוקד',
    desc: 'אלפי תרגילים עם משוב מיידי. לא רק אם טעית — אלא גם למה ואיך לתקן.',
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    Icon: IconCheck,
    delay: 200,
  },
  {
    title: 'מחברת אישית',
    desc: 'כל ההסברים, התרגילים וההתקדמות שלך נשמרים במקום אחד — נגיש תמיד.',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    Icon: IconBook,
    delay: 300,
  },
  {
    title: 'מהירות התקדמות',
    desc: 'לומדים 3x יותר מהר משיטות מסורתיות — בזכות התאמה אישית ותרגול ממוקד.',
    gradient: 'linear-gradient(135deg, #f472b6, #e11d48)',
    Icon: IconBolt,
    delay: 400,
  },
  {
    title: 'מעקב התקדמות',
    desc: 'גרפים וסטטיסטיקות אישיות מראות בדיוק איפה אתה עומד ומה היעדים הבאים.',
    gradient: 'linear-gradient(135deg, #6366f1, #7c3aed)',
    Icon: IconChart,
    delay: 500,
  },
] as const
