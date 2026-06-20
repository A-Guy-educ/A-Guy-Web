import React from 'react'
import { FEATURES } from './features-data'

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-surface-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-gray-900 mb-4">
            פיצ'רים שמשנים את הלמידה
          </h2>
          <p className="text-xl text-surface-gray-600 max-w-2xl mx-auto">
            טכנולוגיה מתקדמת שמותאמת לסגנון הלמידה שלך
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white rounded-3xl p-8 shadow-sm border border-surface-gray-100 transition-all hover:-translate-y-2 hover:shadow-lg"
              style={{ '--delay': `${feature.delay}ms` } as React.CSSProperties}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                style={{ background: feature.gradient }}
              >
                <feature.Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-surface-gray-900 mb-3">{feature.title}</h3>
              <p className="text-surface-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
