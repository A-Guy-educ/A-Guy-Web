/**
 * Client Hooks
 *
 * Reusable React hooks for client-side state, auth, and data fetching.
 * Entry point for hooks imports — re-exports commonly used hooks.
 *
 * @fileType index
 * @domain hooks
 * @ai-summary Client-side React hooks: auth state, access gates, search, progress tracking, time tracking, and exam countdowns
 *
 * Key hooks:
 * - Auth: useCurrentUser, useAccessGate
 * - Search: useCourseSearch (debounced, 2-char minimum)
 * - Progress: useProgressMap (gradeLevel from localStorage userProfile)
 * - Time: useActiveTimeTracker (pauses on tab hidden)
 * - Exams: useExamCountdown (localStorage, 60s polling)
 * - Utils: useDebounce, useMediaQuery
 *
 * Gotchas:
 * - useProgressMap gradeLevel falls back to localStorage userProfile — pass explicitly when the content grade differs from the user's onboarding grade
 * - useActiveTimeTracker stops heartbeats when the browser tab is hidden (visibilitychange)
 * - useCourseSearch debounces at 300ms and requires 2+ characters before firing
 * - useAccessGate timer pauses while warning modal is open (localStorage shift on resume)
 */
