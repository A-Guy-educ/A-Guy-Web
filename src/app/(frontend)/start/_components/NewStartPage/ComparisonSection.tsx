export function ComparisonSection() {
  return (
    <section id="comparison" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            למה{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--gradient-sky-purple-alt)' }}
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
          <div className="rounded-3xl p-8 border-2 border-gray-100 transition-all hover:scale-[1.02] bg-gray-50">
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
              background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(168,85,247,0.05))',
            }}
          >
            <div
              className="absolute top-4 left-4 px-3 py-1 text-white text-xs font-bold rounded-full"
              style={{ background: 'var(--gradient-sky-purple)' }}
            >
              מומלץ
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--gradient-sky-purple)' }}
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
                style={{ backgroundImage: 'var(--gradient-sky-purple-alt)' }}
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
  )
}
