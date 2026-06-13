# Client-Side Loading State Management

**@domain** frontend
**@fileType** infrastructure
**@ai-summary** Centralized client-side loading state: singleton store, React hooks, router integration, and UI indicators for route/action loading.

---

## Entry Point

[`index.ts`](./index.ts) — barrel export for the entire module.

## Core Concept

`LoadingManager` is a singleton store (backed by `useSyncExternalStore`) that tracks in-flight operations by string key and type (`route | screen | inline | action`). All other modules — hooks, components, utilities — are thin wrappers around it.

## The Load-Bearing Gotcha

**`loadingManager` is a process-wide singleton.** In tests, pass a custom manager from `createLoadingManager()` to `createAsyncAction(manager)` — calling the exported `asyncAction` directly hits the real singleton and can cause cross-test pollution. Route operations carry a 15-second safety timeout to auto-unregister if navigation hangs.

## Structure

```
loading/
├── index.ts                      # Barrel export
├── LoadingManager.ts             # Singleton store (useSyncExternalStore)
├── AsyncAction.ts               # asyncAction / createAsyncAction factory
├── keys.ts                      # Canonical loading key constants
├── hooks/
│   ├── useLoadingState.ts       # Subscribe to specific loading states
│   ├── useAsyncAction.ts        # Hook + asyncAction combo
│   └── useRouterWithLoading.ts  # useRouter with loading registration
├── components/
│   ├── RouteLoadingIndicator.tsx # Top progress bar (route transitions)
│   ├── SystemLink.tsx            # Next.js Link with loading feedback
│   └── Spinner.tsx              # Animated SVG spinner
└── utils/
    └── resolveHref.ts           # Normalize Next.js href for comparison
```

## Key Files

| File                                                               | Purpose                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`LoadingManager.ts`](./LoadingManager.ts)                         | Singleton store — register/unregister operations, selectors, subscription |
| [`AsyncAction.ts`](./AsyncAction.ts)                               | Wrap async actions with loading state + duplicate-submission guard        |
| [`hooks/useRouterWithLoading.ts`](./hooks/useRouterWithLoading.ts) | Programmatic navigation with loading state                                |
| [`components/SystemLink.tsx`](./components/SystemLink.tsx)         | Declarative navigation with loading feedback                              |

## Loading Types

| Type     | Who uses it                          | Auto-cleanup        |
| -------- | ------------------------------------ | ------------------- |
| `route`  | `SystemLink`, `useRouterWithLoading` | 15s safety timeout  |
| `action` | `asyncAction`                        | `finally` block     |
| `screen` | Manual `register('key', 'screen')`   | Manual `unregister` |
| `inline` | Manual `register('key', 'inline')`   | Manual `unregister` |

## Common Tasks

| Task                           | File                     | Notes                                       |
| ------------------------------ | ------------------------ | ------------------------------------------- |
| Track a button submit          | `useAsyncAction`         | Sets `isLoading` from key                   |
| Navigate with loading bar      | `useRouterWithLoading`   | Replaces `useRouter`                        |
| Link with loading feedback     | `SystemLink`             | Adds `opacity-60` while loading             |
| Prevent double-submit          | `asyncAction`            | `preventDuplicate: true` (default)          |
| Add a new loading key          | `keys.ts`                | Follows `'<domain>:<action>'` pattern       |
| Test a component using loading | `createLoadingManager()` | Pass custom manager via `createAsyncAction` |
