'use client'

import { useEffect, useRef, useState } from 'react'

import { logger } from '@/infra/utils/logger'
import { ONBOARDING_STEPS } from './features-data'
import { Footer } from './Footer'
import { HeroSection } from './HeroSection'
import { NavigationBar } from './NavigationBar'
import { OnboardingOverlay } from './OnboardingOverlay'
import { SimulationSection } from './SimulationSection'
import { StatsSection } from './StatsSection'
import { TabsSection } from './TabsSection'
import { ComparisonSection } from './ComparisonSection'
import { FeaturesSection } from './FeaturesSection'
import { CtaSection } from './CtaSection'

/* =========================================================
   NEW START PAGE — Issue #159
   Complete redesign based on provided HTML mockup.
   All text is Hebrew (RTL). Design matches HTML exactly.

   Uses .landing-page body class to hide site header/footer.
   ========================================================= */

export type TabName = 'dashboard' | 'chat' | 'notebook'

export function NewStartPage() {
  const [activeTab, setActiveTab] = useState<TabName>('dashboard')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [simulationMessages, setSimulationMessages] = useState<
    Array<{ id: number; role: 'user' | 'ai'; text: string }>
  >([])
  const [simulationInput, setSimulationInput] = useState('')
  const pendingAiMapRef = useRef<Map<number, string>>(new Map())
  const pendingAiIdRef = useRef(0)

  // .landing-page body class hides the site header/footer for an immersive
  // full-page landing experience (defined in globals.css).
  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => {
      document.body.classList.remove('landing-page')
    }
  }, [])

  const scrollToSimulation = () => {
    document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSimulationSend = (directText?: string) => {
    const text = (directText ?? simulationInput).trim()
    if (!text) return
    const msgId = pendingAiIdRef.current++
    pendingAiMapRef.current.set(
      msgId,
      'תודה על השאלה! 🤔 אני אשמח לעזור. הקלד עוד פרטים או שאלה ספציפית יותר, ואענה לך בדיוק על מה שאתה צריך.',
    )
    setSimulationMessages((prev) => [...prev, { id: msgId, role: 'user', text }])
    if (!directText) setSimulationInput('')
    setTimeout(() => {
      try {
        setSimulationMessages((prev) => {
          const aiText = pendingAiMapRef.current.get(msgId)
          pendingAiMapRef.current.delete(msgId)
          return aiText ? [...prev, { id: msgId, role: 'ai' as const, text: aiText }] : prev
        })
      } catch (error) {
        logger.error({ err: error }, 'Failed to add simulation AI message')
        pendingAiMapRef.current.delete(msgId)
        setSimulationMessages((prev) => prev.filter((m) => m.id !== msgId))
      }
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
      <div className="bg-gray-50 text-gray-900 overflow-x-hidden min-h-screen" dir="rtl">
        <NavigationBar />
        <HeroSection onScrollToSimulation={scrollToSimulation} />
        <ComparisonSection />
        <StatsSection />
        <FeaturesSection />
        <TabsSection activeTab={activeTab} onTabChange={setActiveTab} />
        <SimulationSection
          simulationMessages={simulationMessages}
          simulationInput={simulationInput}
          onInputChange={setSimulationInput}
          onKeyDown={handleSimulationKey}
          onSend={handleSimulationSend}
        />
        <CtaSection />
        <Footer />

        {/* Onboarding overlay */}
        {showOnboarding && (
          <OnboardingOverlay
            onboardingStep={onboardingStep}
            onNext={handleOnboardingNext}
            onPrev={handleOnboardingPrev}
            onDismiss={() => setShowOnboarding(false)}
          />
        )}
      </div>
    </>
  )
}
