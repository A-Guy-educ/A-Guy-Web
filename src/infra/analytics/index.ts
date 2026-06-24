/**
 * Analytics Public API
 *
 * This is the ONLY import path product code should use
 * Import from '@/lib/analytics' and nothing else
 *
 * @fileType module
 * @domain analytics
 * @pattern analytics-public-api
 * @ai-summary Thin re-export facade — no direct SDK calls, no business logic. Enforces alias-before-identify ordering; reset clears identity but does NOT flush the queued event batch (events already queued are still sent).
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
