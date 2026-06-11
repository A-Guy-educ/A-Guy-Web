/**
 * @ai-summary Central registry of well-known loading keys — guards against typos
 * and accidental key collisions across the codebase. Route keys and auth keys are
 * wired here; data-fetching keys are added as integrations are built.
 *
 * @ai-trap Keys not listed here are still usable as raw strings, but any key
 * used across more than one call site should be added here first to avoid collisions.
 */
// Only includes keys actually used in this task
export const LOADING_KEYS = {
  // Route transitions
  ROUTE_TRANSITION: 'route:transition',

  // Auth actions (used in this task)
  LOGIN: 'auth:login',
  SIGNUP: 'auth:signup',

  // Data fetching (used in this task)
  CHAPTERS_LOAD: 'data:chapters',
} as const

export type LoadingKey = (typeof LOADING_KEYS)[keyof typeof LOADING_KEYS]

// Future keys (NOT wired in this PR - add when integrating in separate tasks):
// - LOGOUT: 'auth:logout'
// - CHAT_SEND: 'chat:send'
// - EXERCISE_IMPORT: 'exercise:import' (ConvertButton - low-traffic internal tool)
// - USER_AUTH: 'data:user-auth' (HeaderClient auth check - keep silent/inline)
