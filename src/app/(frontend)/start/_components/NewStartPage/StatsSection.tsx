export function StatsSection() {
  return (
    <section
      id="stats"
      className="py-20 relative overflow-hidden"
      style={{ background: 'var(--gradient-blue-purple-deep)' }}
    >
      <div className="absolute inset-0">
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
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
  )
}
