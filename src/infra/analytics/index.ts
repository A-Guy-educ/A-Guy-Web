/**
 * @ai-summary Analytics Public API — single import path for all product tracking.
 *
 * Entry point for product code. All analytics tracking MUST go through `analytics.track()`
 * or via `systemEventBus.emit()` (which feeds into analytics.track()).
 *
 * TRAP: Never call window.gtag/window.mixpanel directly — always route through here.
 * GOTCHA: `initializeAnalytics()` must be called before any track() calls.
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
