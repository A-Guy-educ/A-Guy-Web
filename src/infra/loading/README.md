---
title: Loading State Management
domain: ui
fileType: infrastructure
aiSummary: Global loading state system for route transitions, async actions, and UI spinners. The singleton LoadingManager auto-unregisters route operations after 15 s to prevent stuck progress bars. All hooks are SSR-safe via useSyncExternalStore.
---

## Entry Point

```typescript
import {
  loadingManager, // Singleton store
  useLoadingState, // Subscribe to specific loading conditions
  useAsyncAction, // Wrap async operations with loading state
  useRouterWithLoading, // useRouter replacement with loading registration
  asyncAction, // Standalone wrapper for async operations
  RouteLoadingIndicator, // Progress bar component
  SystemLink, // Link that shows loading state
  Spinner, // Animated loading indicator
  LOADING_KEYS, // Central registry of loading key constants
} from '@/infra/loading'
```

## Core Concepts

**LoadingManager (singleton)** — In-memory store of active loading operations, keyed by string. Supports four operation types: `route`, `screen`, `inline`, `action`. Route operations auto-unregister after a 15 s safety timeout to prevent stuck progress bars.

**Loading keys** — String constants in `LOADING_KEYS` (e.g., `ROUTE_TRANSITION`, `LOGIN`). Prevents typos and centralizes all keys in one place.

**Reactivity** — Uses `useSyncExternalStore`, so hooks re-render only when the specific condition (busy/screen/route/key) changes — not on every LoadingManager mutation.

## Usage Patterns

### Route loading indicator

Place `<RouteLoadingIndicator />` once in a root layout. It subscribes to `LOADING_KEYS.ROUTE_TRANSITION` and shows an indeterminate progress bar when a route transition is in progress.

### Programmatic navigation with loading

```typescript
const router = useRouterWithLoading()
router.push('/next-page') // Registers ROUTE_TRANSITION immediately
```

### Link with loading feedback

```typescript
<SystemLink href="/courses">Browse Courses</SystemLink>
// Dims and aria-disabled while ROUTE_TRANSITION is active
```

### Async action with loading

```typescript
const { execute, isLoading } = useAsyncAction((formData: FormData) => loginAction(formData), {
  key: LOADING_KEYS.LOGIN,
})
```

## Gotchas

- **Route loading registered at trigger time, not completion.** `useRouterWithLoading` and `SystemLink` register the loading key when navigation is triggered. `RouteLoadingIndicator` unregisters it when `usePathname()` / `useSearchParams()` change — meaning the bar disappears when the URL updates, even if the page isn't fully rendered.
- **preventDuplicate defaults to true.** `asyncAction` returns `{ success: false, error: 'Action already in progress' }` for duplicate calls unless `preventDuplicate: false` is passed.
- **SSR safe.** All hooks return `false` from `getServerSnapshot`. No server-client hydration mismatches.
- **Keys are not automatically unregistered on error.** `asyncAction` always calls `manager.unregister(key)` in `finally`, but custom callers must ensure they do the same.

## File Structure

```
src/infra/loading/
├── README.md                        # This file
├── index.ts                         # Public API exports
├── LoadingManager.ts                # Singleton store + types
├── AsyncAction.ts                   # asyncAction wrapper factory
├── keys.ts                          # LOADING_KEYS constants
├── hooks/
│   ├── useLoadingState.ts           # Subscribe to loading conditions
│   ├── useAsyncAction.ts            # Hook for async + loading
│   └── useRouterWithLoading.ts      # useRouter with loading registration
├── components/
│   ├── RouteLoadingIndicator.tsx    # Progress bar component
│   ├── SystemLink.tsx               # Link with loading feedback
│   └── Spinner.tsx                  # Animated spinner
└── utils/
    └── resolveHref.ts               # Normalize hrefs for route comparison
```
