/**
 * Analytics Public API
 *
 * This is the ONLY import path product code should use
 * Import from '@/lib/analytics' and nothing else
 *
 * @ai-summary Single entry point for all analytics tracking. Provides track, identify, alias, and reset.
 *
 * ## Gotchas
 *
 * | Behavior | Details |
 * |----------|---------|
 * | No direct SDK calls | Never call `window.gtag` or `window.mixpanel` directly — use the tracker API only |
 * | alias-before-identify | Call `alias()` BEFORE `identify()` during registration to merge anonymous history |
 * | reset does NOT flush | `reset()` clears local identity but does NOT flush queued events — events after reset may still be attributed to the old user |
 */

// Core API
export { analytics, initializeAnalytics, getSessionId } from './core/tracker'

// Provider (for app initialization)
export { AnalyticsProvider } from './providers/AnalyticsProvider'

// Event constants
export { PRODUCT_EVENTS } from './contracts/events'
export type { ProductEvent } from './contracts/events'

// TypeScript types
export type {
  PageViewProperties,
  SessionStartedProperties,
  UserIdentifiedProperties,
  CourseEnteredProperties,
  LessonStartedProperties,
  LessonCompletedProperties,
  PdfViewedProperties,
  ChatMessageSentProperties,
  RegistrationPromptShownProperties,
  RegistrationCompletedProperties,
} from './contracts/schemas'

// Configuration (for internal use)
export { analyticsConfig } from './config'
