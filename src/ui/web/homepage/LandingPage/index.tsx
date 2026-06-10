'use client'

import { cn } from '@/infra/utils/ui'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'
import { ThemeSelector } from '@/ui/web/providers/Theme/ThemeSelector'
import { LanguageSwitcher } from '@/ui/web/LanguageSwitcher'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Brain,
  GraduationCap,
  LineChart,
  MessageCircle,
  MessageSquare,
  Notebook as NotebookIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { useState } from 'react'

interface LandingPageProps {
  onGetStarted: () => void
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const ease = [0.25, 0.46, 0.45, 0.94] as const

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease } },
}

// 6 features for the features grid
const FEATURES = [
  {
    key: 'aiTutor',
    icon: Brain,
    color: 'hsl(217 91% 60%)',
    bgClass: 'from-blue-500/20 to-blue-600/5',
  },
  {
    key: 'practice',
    icon: Target,
    color: 'hsl(0 72% 51%)',
    bgClass: 'from-red-500/20 to-red-600/5',
  },
  {
    key: 'chat',
    icon: MessageCircle,
    color: 'hsl(142 71% 45%)',
    bgClass: 'from-green-500/20 to-green-600/5',
  },
  {
    key: 'progress',
    icon: LineChart,
    color: 'hsl(330 81% 60%)',
    bgClass: 'from-pink-500/20 to-pink-600/5',
  },
  {
    key: 'exams',
    icon: GraduationCap,
    color: 'hsl(45 93% 47%)',
    bgClass: 'from-yellow-500/20 to-yellow-600/5',
  },
  {
    key: 'support',
    icon: ShieldCheck,
    color: 'hsl(280 67% 55%)',
    bgClass: 'from-purple-500/20 to-purple-600/5',
  },
] as const

// Statistics data
const STATS = [
  { key: 'lessons', value: '20+', labelKey: 'stats.lessons' },
  { key: 'exercises', value: '50K+', labelKey: 'stats.exercises' },
  { key: 'students', value: '100K+', labelKey: 'stats.students' },
  { key: 'ai', value: '24/7', labelKey: 'stats.ai' },
] as const

// Tab items for the simulation section
const TABS = [
  { key: 'dashboard', labelKey: 'tabs.dashboard', icon: LineChart },
  { key: 'chat', labelKey: 'tabs.chat', icon: MessageSquare },
  { key: 'notebook', labelKey: 'tabs.notebook', icon: NotebookIcon },
] as const

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const t = useTranslations('landing')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'notebook'>('dashboard')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(true)

  // Header/footer hiding is managed by HomePage parent component

  return (
    <div className="overflow-hidden">
      {/* ─── FLOATING CONTROLS ─── */}
      <div className="fixed top-4 end-4 z-50 flex items-center gap-2 bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 shadow-elevation-2 px-2 py-1">
        <LanguageSwitcher />
        <div className="w-px h-6 bg-border/50" />
        <ThemeSelector />
      </div>

      {/* ─── HERO ─── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-background to-background" />
          <motion.div
            className="absolute top-[-20%] start-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.07] blur-[120px]"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[-10%] end-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/[0.06] blur-[100px]"
            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[30%] end-[20%] w-[30vw] h-[30vw] rounded-full bg-success/[0.04] blur-[80px]"
            animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          className="container text-center max-w-4xl px-6"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-body-sm font-medium border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {t('hero.badge')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-display-lg md:text-display-xl lg:text-display-2xl font-bold tracking-tight mb-6"
          >
            <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t('hero.title')}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-body-lg md:text-body-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-content-gap justify-center"
          >
            <Button
              size="lg"
              onClick={onGetStarted}
              className="h-14 px-10 rounded-xl shadow-elevation-3 hover:shadow-elevation-4 text-primary-foreground text-[1.125rem]"
            >
              {t('hero.cta')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onGetStarted}
              className="h-14 px-10 rounded-xl text-[1.125rem]"
            >
              {t('hero.secondaryCta')}
            </Button>
          </motion.div>

          {/* Hero Stats Preview */}
          <motion.div variants={fadeUp} className="mt-16">
            <div className="flex flex-wrap justify-center gap-8">
              {STATS.map((stat) => {
                const Icon =
                  stat.key === 'lessons'
                    ? BookOpen
                    : stat.key === 'exercises'
                      ? Target
                      : stat.key === 'students'
                        ? Users
                        : Brain
                return (
                  <div key={stat.key} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-right">
                      <div className="text-heading-md font-bold text-primary">{stat.value}</div>
                      <div className="text-body-xs text-muted-foreground">{t(stat.labelKey)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="py-section-lg bg-muted/30">
        <div className="container max-w-6xl px-6">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={container}
          >
            <motion.h2
              variants={fadeUp}
              className="text-display-sm md:text-display-md font-bold mb-4"
            >
              {t('comparison.heading')}
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Private Tutoring column */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              className="p-8 rounded-2xl bg-gradient-to-br from-success/10 to-card border border-success/20"
            >
              <h3 className="text-heading-lg font-bold mb-6 text-success">
                {t('comparison.privateTitle')}
              </h3>
              <ul className="space-y-4">
                {['personalized', 'instantFeedback', 'progressTracking'].map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-body-md">{t(`comparison.benefits.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Traditional Tutoring column */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              className="p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-card border border-border"
            >
              <h3 className="text-heading-lg font-bold mb-6 text-muted-foreground">
                {t('comparison.traditionalTitle')}
              </h3>
              <ul className="space-y-4">
                {['scheduling', 'cost', 'availability'].map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-body-md text-muted-foreground">
                      {t(`comparison.drawbacks.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── STATISTICS ─── */}
      <section className="py-section-lg">
        <div className="container max-w-6xl px-6">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={container}
          >
            {STATS.map((stat) => (
              <motion.div
                key={stat.key}
                variants={scaleIn}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border"
              >
                <div className="text-display-sm md:text-display-md font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-body-sm text-muted-foreground">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES (6-grid) ─── */}
      <section className="py-section-lg bg-muted/30">
        <div className="container max-w-6xl px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={container}
          >
            <motion.h2
              variants={fadeUp}
              className="text-display-sm md:text-display-md font-bold mb-4"
            >
              {t('features.heading')}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-muted-foreground max-w-xl mx-auto"
            >
              {t('features.subheading')}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={container}
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.key}
                  variants={scaleIn}
                  className={cn(
                    'group relative p-6 rounded-2xl border border-border/50',
                    'bg-gradient-to-br',
                    feature.bgClass,
                    'hover:shadow-card-hover transition-all duration-normal hover:-translate-y-1',
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color.replace(')', ' / 0.15)')}` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-heading-md font-bold mb-2">
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="text-body-sm text-muted-foreground leading-relaxed">
                    {t(`features.${feature.key}.description`)}
                  </p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── SIMULATION TABS ─── */}
      <section className="py-section-lg">
        <div className="container max-w-6xl px-6">
          <motion.div
            className="text-center mb-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={container}
          >
            <motion.h2
              variants={fadeUp}
              className="text-display-sm md:text-display-md font-bold mb-4"
            >
              {t('simulation.heading')}
            </motion.h2>
          </motion.div>

          {/* Tab navigation */}
          <div className="flex justify-center gap-4 mb-8">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-elevation-2'
                      : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t(tab.labelKey)}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="bg-card rounded-2xl border border-border p-8 min-h-[300px]"
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <h3 className="text-heading-md font-bold mb-4">{t('simulation.dashboardTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['lesson1', 'lesson2', 'lesson3', 'lesson4'].map((key, i) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-body-sm font-medium">
                          {t(`simulation.lessons.${key}`)}
                        </div>
                        <div className="text-body-xs text-muted-foreground">
                          {i < 2 ? '100%' : i === 2 ? '80%' : '50%'} {t('simulation.completed')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4">
                <h3 className="text-heading-md font-bold mb-4">{t('simulation.chatTitle')}</h3>
                <div className="space-y-3">
                  {['question1', 'question2', 'question3'].map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-accent" />
                      </div>
                      <div className="text-body-sm">{t(`simulation.questions.${key}`)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notebook' && (
              <div className="space-y-4">
                <h3 className="text-heading-md font-bold mb-4">{t('simulation.notebookTitle')}</h3>
                <div className="p-6 rounded-xl bg-muted/50 border border-border">
                  <p className="text-body-md text-muted-foreground text-center">
                    {t('simulation.notebookDesc')}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── BOTTOM CTA (2 buttons) ─── */}
      <section className="py-section-xl">
        <motion.div
          className="container max-w-3xl px-6 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={container}
        >
          <motion.div
            variants={scaleIn}
            className="relative p-10 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-primary/20 overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 start-1/4 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 end-1/4 w-48 h-48 bg-accent/10 rounded-full blur-[80px]" />
            </div>

            <h2 className="text-display-sm md:text-display-md font-bold mb-4">
              {t('cta.heading')}
            </h2>
            <p className="text-body-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              {t('cta.subheading')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="h-14 px-10 rounded-xl shadow-elevation-3 hover:shadow-elevation-4 text-primary-foreground text-[1.125rem]"
              >
                {t('cta.primaryButton')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onGetStarted}
                className="h-14 px-10 rounded-xl text-[1.125rem]"
              >
                {t('cta.secondaryButton')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── ONBOARDING OVERLAY ─── */}
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-6 start-6 z-50 max-w-sm bg-card rounded-2xl border border-border shadow-elevation-4 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-body-sm font-medium">{t('onboarding.title')}</span>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {onboardingStep === 0 && <p className="text-body-sm">{t('onboarding.welcome')}</p>}
            {onboardingStep === 1 && <p className="text-body-sm">{t('onboarding.question')}</p>}
            {onboardingStep === 2 && <p className="text-body-sm">{t('onboarding.answer')}</p>}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === onboardingStep ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
            {onboardingStep < 2 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOnboardingStep(onboardingStep + 1)}
              >
                {t('onboarding.next')}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowOnboarding(false)}>
                {t('onboarding.done')}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
