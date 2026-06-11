/**
 * @ai-summary Centralized client-side loading state management — singleton LoadingManager
 * backed by useSyncExternalStore, with React hooks, router wrappers, and UI components.
 *
 * Entry point: this file. Core contract: register a key before an async operation,
 * unregister after. Route transitions use a 15-second safety timeout to prevent stuck state.
 *
 * @ai-trap The singleton manager is shared across the entire app — calling register()
 * without a matching unregister() leaks loading state. SystemLink/useRouterWithLoading
 * handle this correctly; raw usage must pair register/unregister in finally blocks.
 */
export {
  loadingManager,
  createLoadingManager,
  type LoadingType,
  type LoadingOperation,
  type LoadingSnapshot,
  type LoadingManagerInstance,
} from './LoadingManager'

// Hooks (direct store access, no context needed)
export { useLoadingState } from './hooks/useLoadingState'
export { useAsyncAction } from './hooks/useAsyncAction'
export { useRouterWithLoading } from './hooks/useRouterWithLoading'

// Utilities
export {
  asyncAction,
  createAsyncAction,
  type ActionResult,
  type AsyncActionOptions,
} from './AsyncAction'
export { resolveHrefToString, buildCurrentPath } from './utils/resolveHref'

// Components
export { RouteLoadingIndicator } from './components/RouteLoadingIndicator'
export { SystemLink } from './components/SystemLink'
export { Spinner } from './components/Spinner'
// NOTE: LoadingBoundary and skeletons deferred to future task (not in this PR)

// Keys
export { LOADING_KEYS, type LoadingKey } from './keys'
