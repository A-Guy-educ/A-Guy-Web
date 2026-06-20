'use client'

import { ONBOARDING_STEPS } from './features-data'

interface OnboardingOverlayProps {
  onboardingStep: number
  onNext: () => void
  onPrev: () => void
  onDismiss: () => void
}

export function OnboardingOverlay({
  onboardingStep,
  onNext,
  onPrev,
  onDismiss,
}: OnboardingOverlayProps) {
  return (
    <div id="onboarding-overlay" className="fixed bottom-6 left-6 z-50 max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4" style={{ background: 'var(--gradient-sky-purple)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-white font-semibold">A-Guy מזמין אותך</span>
            </div>
            <button onClick={onDismiss} className="text-white/80 hover:text-white transition">
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
            <span className="text-xs text-surface-gray-500">
              שאלה {onboardingStep + 1} מתוך {ONBOARDING_STEPS.length}
            </span>
          </div>
          <div className="rounded-xl p-3 border bg-sky-50 border-sky-200">
            <p className="text-sky-700 font-medium text-sm">
              ❓ {ONBOARDING_STEPS[onboardingStep].q}
            </p>
          </div>
          <div className="rounded-xl p-3 border bg-purple-50 border-purple-200">
            <p className="text-purple-700 text-sm">💡 {ONBOARDING_STEPS[onboardingStep].a}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onPrev}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              onboardingStep === 0
                ? 'hidden'
                : 'bg-surface-gray-100 text-surface-gray-700 hover:bg-surface-gray-200'
            }`}
          >
            ← הקודם
          </button>
          <button
            onClick={onNext}
            className="flex-1 px-4 py-2 text-white rounded-xl text-sm font-medium transition shadow-md"
            style={{ background: 'var(--gradient-sky-purple)' }}
          >
            {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'סיום ✓' : 'הבא →'}
          </button>
        </div>
      </div>
    </div>
  )
}
