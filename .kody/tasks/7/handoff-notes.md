Fix: Updated vitest.setup.ts storage bridging with try-catch fallback.

Root cause: The previous fix bridged window.localStorage to globalThis.localStorage unconditionally when window was defined. However, in jsdom with opaque origin (no proper URL set), accessing window.localStorage throws `SecurityError: localStorage is not available for opaque origins`. The previous code did not handle this case - when window.localStorage was falsy, globalThis.localStorage was set to undefined, and the fallback mock was not created.

Fix: Wrap window.localStorage and window.sessionStorage access in try-catch. If accessing them throws (e.g., SecurityError from jsdom opaque origin), fall back to the mock. The mock uses `Object.create(Storage.prototype)` so that `Storage.prototype.setItem` spies still intercept calls correctly.

Key change:
- Before: `if (typeof window !== 'undefined') { globalThis.localStorage = window.localStorage } else { fallback }`
- After: `if (typeof window !== 'undefined') { try { globalThis.localStorage = window.localStorage } catch { globalThis.localStorage = createStorageMock() } } else { fallback }`
