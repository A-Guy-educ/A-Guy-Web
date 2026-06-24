/**
 * Analytics Public API
 *
 * This is the ONLY import path product code should use
 * Import from '@/lib/analytics' and nothing else
 *
 * @ai-summary Thin re-export facade — no SDK calls happen here. All tracking is routed through the core tracker, which validates, queues, and dispatches to GA4 and Mixpanel adapters.
 *
 * Gotcha: `alias()` must be called BEFORE `identify()` during registration to merge anonymous event history with the new user account. `reset()` clears identity state but does not flush the queued event buffer.
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
