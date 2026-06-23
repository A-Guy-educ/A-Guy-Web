// @vitest-environment jsdom
/**
 * LayoutClient - SITE_INIT Event Tests
 *
 * Tests that LayoutClient emits SITE_INIT on mount.
 */

import { LayoutClient } from '@/app/(frontend)/LayoutClient'
import { SYSTEM_EVENTS, systemEventBus } from '@/infra/system-events'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock I18nProvider since AgentChatWindow uses useTranslations
vi.mock('@/ui/web/providers/I18n', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'learningAgent.title': 'Learning Assistant',
      'learningAgent.subtitle': 'Your personal AI guide',
      'learningAgent.welcomeMessage':
        "Hi! I'm your personal learning assistant. I can help you with your courses, suggest what to learn next, and track your progress. How can I help you today?",
      'learningAgent.inputPlaceholder': 'Ask me anything...',
      'learningAgent.error.authRequired': 'Please log in to use the learning assistant',
      'learningAgent.error.sendFailed': 'Failed to send message. Please try again.',
    }
    return translations[key] ?? key
  },
  useLocale: () => 'en',
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('LayoutClient SITE_INIT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    systemEventBus.reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('emits SITE_INIT event on mount', () => {
    const handler = vi.fn()
    systemEventBus.on(SYSTEM_EVENTS.SITE_INIT, handler)

    render(<LayoutClient />)

    expect(handler).toHaveBeenCalledTimes(1)
    const envelope = handler.mock.calls[0][0]
    expect(envelope.name).toBe(SYSTEM_EVENTS.SITE_INIT)
    expect(envelope.payload).toEqual({})
  })

  it('emits SITE_INIT only once on mount', () => {
    const handler = vi.fn()
    systemEventBus.on(SYSTEM_EVENTS.SITE_INIT, handler)

    const { rerender } = render(<LayoutClient />)

    expect(handler).toHaveBeenCalledTimes(1)

    // Re-render should not emit again (useEffect with empty deps)
    rerender(<LayoutClient />)

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
