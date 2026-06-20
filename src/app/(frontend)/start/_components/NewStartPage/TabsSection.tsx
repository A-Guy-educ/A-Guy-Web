'use client'

import React from 'react'
import type { TabName } from './index'

interface TabsSectionProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
}

export function TabsSection({ activeTab, onTabChange }: TabsSectionProps) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">נראה איך זה נראה</h2>
          <p className="text-xl text-gray-600">3 חלונות — כל מה שאתה צריך במקום אחד</p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-1 p-1.5 rounded-2xl bg-gray-100">
            {(
              [
                { id: 'dashboard' as const, label: '📊 Dashboard' },
                { id: 'chat' as const, label: "💬 צ'אט" },
                { id: 'notebook' as const, label: '📓 מחברת' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeTab === tab.id ? { background: 'var(--gradient-sky-purple)' } : {}}
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
            <div className="rounded-3xl p-8 border border-gray-200 bg-gray-50">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {[
                  {
                    title: 'התקדמות כללית',
                    value: '78%',
                    bar: 78,
                    color: 'var(--gradient-sky-purple)',
                  },
                  {
                    title: 'תרגילים החודש',
                    value: '142',
                    change: '↑ 23% מהחודש שעבר',
                    color: 'var(--accent-sky)',
                  },
                  { title: 'שעות למידה', value: '24.5', sub: 'החודש', color: 'var(--accent-sky)' },
                ].map((card) => (
                  <div key={card.title} className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">{card.title}</div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{card.value}</div>
                    {'bar' in card ? (
                      <div className="w-full h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${card.bar}%`, background: card.color }}
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
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
                    { name: 'פונקציות', pct: 85, color: 'var(--accent-sky)' },
                    { name: 'גזירה', pct: 62, color: 'var(--accent-purple)' },
                    { name: 'אינטגרציה', pct: 34, color: 'var(--accent-sky)' },
                  ].map((topic) => (
                    <div key={topic.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700">{topic.name}</span>
                        <span className="text-sm font-medium" style={{ color: topic.color }}>
                          {topic.pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200">
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
            <div className="rounded-3xl border border-gray-200 overflow-hidden bg-gray-50">
              <div className="p-4" style={{ background: 'var(--gradient-blue-purple-deep)' }}>
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
                  style={{ background: 'var(--gradient-sky-purple)' }}
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
                    className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 text-right bg-gray-100"
                    style={
                      {
                        '--tw-ring-color': 'var(--accent-sky)',
                      } as React.CSSProperties
                    }
                  />
                  <button
                    className="px-6 py-3 text-white rounded-xl font-medium transition shadow-lg"
                    style={{ background: 'var(--gradient-sky-purple)' }}
                  >
                    שלח
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notebook Tab */}
          {activeTab === 'notebook' && (
            <div className="rounded-3xl border border-gray-200 overflow-hidden bg-gray-50">
              <div className="bg-gray-100 p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
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
                          ? 'color-mix(in srgb, var(--accent-sky) 5%, transparent)'
                          : 'color-mix(in srgb, var(--accent-purple) 5%, transparent)',
                      borderColor:
                        note.color === 'sky'
                          ? 'color-mix(in srgb, var(--accent-sky) 20%, transparent)'
                          : 'color-mix(in srgb, var(--accent-purple) 20%, transparent)',
                    }}
                  >
                    <div
                      className="text-xs font-medium mb-1"
                      style={{
                        color:
                          note.color === 'sky'
                            ? 'var(--accent-sky-deep)'
                            : 'var(--accent-purple-deep)',
                      }}
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
                    backgroundColor: 'color-mix(in srgb, var(--accent-amber) 5%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-amber) 20%, transparent)',
                  }}
                >
                  <div className="text-xs font-medium mb-1 text-amber-600">⭐ הערה חשובה</div>
                  <p className="text-gray-700 text-sm">לכל קבוע ביטוי (C) יש נגזרת 0</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
