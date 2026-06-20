Fix: Updated vitest.setup.ts storage bridging for jsdom environments.

Root cause: The previous mock used a plain object with setItem as an own property and a Map-based getItem returning undefined for missing keys. Two failures resulted:

1. tracker.test.ts getSessionId(): bare sessionStorage.getItem() hit globalThis.sessionStorage (the mock), returning undefined. But Storage.getItem must return null for missing keys — the falsy undefined caused a new session ID to be generated on every call instead of being cached. The test's beforeEach spy on window.sessionStorage.getItem never intercepted because globalThis !== window in jsdom.

2. useLessonViewMode.test.ts setItem spy: the test spies on Storage.prototype.setItem and expects it to be called. But the plain mock's setItem was an own property, so calling localStorage.setItem bypassed the prototype entirely — the spy was never triggered.

Fix: In jsdom (typeof window !== 'undefined'), assign globalThis.localStorage = window.localStorage and globalThis.sessionStorage = window.sessionStorage. This makes bare access in product code use the same Storage objects that jsdom provides (with methods on the prototype) and that test beforeEach hooks spy on. Fallback mock for non-jsdom environments preserved.
