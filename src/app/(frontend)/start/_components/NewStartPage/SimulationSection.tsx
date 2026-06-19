'use client'

interface SimulationSectionProps {
  simulationMessages: Array<{ id: number; role: 'user' | 'ai'; text: string }>
  simulationInput: string
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSend: (directText?: string) => void
}

export function SimulationSection({
  simulationMessages,
  simulationInput,
  onInputChange,
  onKeyDown,
  onSend,
}: SimulationSectionProps) {
  return (
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
                  style={{ background: 'var(--gradient-sky-purple)' }}
                >
                  A
                </div>
                <div className="rounded-2xl rounded-tl-sm p-4 flex-1 bg-white/10">
                  <p className="text-gray-200">הקלד שאלה במתמטיקה ואני אעזור לך!</p>
                </div>
              </div>
            ) : (
              simulationMessages.map((msg, i) =>
                msg.role === 'user' ? (
                  <div key={i} className="flex gap-3 justify-end">
                    <div
                      className="rounded-2xl rounded-tr-sm p-4 max-w-[70%]"
                      style={{ background: 'var(--gradient-sky-purple)' }}
                    >
                      <p className="text-white">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                      style={{ background: 'var(--gradient-sky-purple)' }}
                    >
                      A
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-4 flex-1 bg-white/10">
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
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="למשל: איך פותרים משוואה ריבועית?"
              className="flex-1 px-5 py-4 rounded-2xl border focus:outline-none text-white placeholder-gray-400 text-right"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            />
            <button
              onClick={() => onSend()}
              className="px-8 py-4 text-white rounded-2xl font-bold transition-all shadow-lg"
              style={{ background: 'var(--gradient-sky-purple)' }}
            >
              שלח
            </button>
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {['איך פותרים משוואה ריבועית?', 'מהי נגזרת?', 'הסבר את משפט פיתגורס'].map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                className="px-4 py-2 rounded-xl text-sm text-gray-300 transition hover:bg-white/20 bg-white/10"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
