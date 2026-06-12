# Loading State Management

**@domain** frontend
**@fileType** infrastructure
**@ai-summary** Singleton LoadingManager with useSyncExternalStore — tracks route/action/screen/inline loading ops with 15s route safety timeout

---

## Architecture

```
src/infra/loading/
├── index.ts                    # Public API (entry point)
├── LoadingManager.ts          # Core singleton store
├── AsyncAction.ts             # asyncAction() wrapper with duplicate prevention
├── keys.ts                    # Central LOADING_KEYS registry
├── hooks/
│   ├── useLoadingState.ts     # Selector-based state subscription
│   ├── useAsyncAction.ts      # Hook wrapper for asyncAction
│   └── useRouterWithLoading.ts # Router hook with loading registration
├── components/
│   ├── RouteLoadingIndicator.tsx  # Top progress bar
│   ├── Spinner.tsx            # Animated SVG spinner
│   └── SystemLink.tsx         # Link with loading state
└── utils/
    └── resolveHref.ts        # URL normalization for route comparison
```

## Core Concept

`LoadingManager` is a singleton that tracks in-flight loading operations by key. React hooks subscribe via `useSyncExternalStore` for SSR-safe reactivity without React context.

## Loading Types

| Type     | Description                       | Safety Timeout      |
| -------- | --------------------------------- | ------------------- |
| `route`  | Next.js navigation                | 15s auto-unregister |
| `screen` | Full-screen operations            | None                |
| `inline` | Inline/component-level operations | None                |
| `action` | Form submissions, async actions   | None                |

## Key Gotchas

1. **Route safety timeout**: Route transitions auto-unregister after 15s to prevent stuck state — do not rely on manual unregister for navigation
2. **Hash-only links**: Same-page anchors (`#section`) must NOT register loading — `resolveHrefToString(href, true)` strips hash for comparison
3. **Duplicate prevention**: `asyncAction` defaults to `preventDuplicate: true` — returns early if key already busy
4. **SSR safe**: `getServerSnapshot` returns `{ version: 0, operationCount: 0 }` — no hydration mismatches

## Entry Point

Import everything from `@/infra/loading`:

```typescript
import {
  loadingManager,
  useLoadingState,
  asyncAction,
  RouteLoadingIndicator,
} from '@/infra/loading'
```

## Related

- [`src/client/README.md`](../../client/README.md) — Client-side hooks and state
- [`src/ui/web/`](../../ui/web/README.md) — Web UI components
