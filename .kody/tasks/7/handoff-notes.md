Fix: Updated vitest.setup.ts localStorage/sessionStorage bridging for jsdom.

Root cause: In the try block, the code validated `window.localStorage` exists (const _test = window.localStorage), then accessed it AGAIN on the next line for the `Object.defineProperty` value. If `window.localStorage` was a broken Storage object (exists but with undefined methods — NOT a SecurityError), the first access succeeded, `globalThis.localStorage` was assigned the broken object, and the fallback never triggered. Tests calling `window.localStorage.getItem()` got "Cannot read properties of undefined (reading 'getItem')".

The previous session's fix (assigning fallback to window in catch block) was already present but not solving the root case — the broken Storage path through the try block was never handled.

Fix: Store `window.localStorage` in a variable (`ls`). Validate `typeof ls?.getItem === 'function'` before using it. If Storage exists but methods are undefined (or access throws), throw to trigger the catch block which creates and assigns the fallback mock to BOTH `window` and `globalThis`.

Key change:
```typescript
// Before: accessed window.localStorage twice, no method validation
const _test = window.localStorage
Object.defineProperty(globalThis, 'localStorage', { value: window.localStorage, ... })

// After: store once, validate methods exist, throw if broken
const ls = window.localStorage
if (typeof ls?.getItem === 'function') {
  Object.defineProperty(globalThis, 'localStorage', { value: ls, ... })
} else {
  throw new Error('window.localStorage has no getItem method')
}
```
Same pattern applied for sessionStorage.
