Fix: Updated vitest.setup.ts storage bridging for jsdom opaque origin.

Root cause: When jsdom (jsdom 26.1.0 on Node 24) has an opaque origin (no proper URL), accessing window.localStorage/window.sessionStorage throws SecurityError. The previous fix correctly caught this and created a fallback mock, but only assigned it to globalThis — not to window itself. After the first throw, jsdom "consumes" the error: subsequent accesses to window.localStorage return undefined (not another throw). Tests call window.localStorage.clear() directly, which was still undefined.

Fix: In the catch block for both localStorage and sessionStorage, the fallback mock is now assigned to BOTH window (via Object.defineProperty(window, 'localStorage', { value: fallback })) AND globalThis. This ensures both bare access (globalThis.localStorage) and window access (window.localStorage) work correctly.

Key change:
```typescript
} catch {
  const fallback = createStorageMock()
  Object.defineProperty(globalThis, 'localStorage', { value: fallback, ... })
  Object.defineProperty(window, 'localStorage', { value: fallback, ... }) // NEW
}
```
Same pattern applied for sessionStorage.