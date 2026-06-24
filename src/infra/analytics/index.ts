/**
 * Analytics Public API
 *
 * This is the ONLY import path product code should use
 * Import from '@/lib/analytics' and nothing else
 *
 * @fileType index
 * @domain analytics
 * @ai-summary Public entry point for analytics. GOTCHA: never call SDK methods (window.gtag, window.mixpanel) directly — always go through this API. GOTCHA: alias() must be called BEFORE identify() during registration to merge anonymous history. GOTCHA: reset() does NOT flush the event queue — events queued before reset may still be sent.
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
