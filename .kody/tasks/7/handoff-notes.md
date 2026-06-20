Fix: mock.setItem in vitest.setup.ts createStorageMock must call Storage.prototype.

Root cause: The fallback mock's setItem was defined as an own property on the mock object that just stored data in a Map (data.set(...)) and never called Storage.prototype.setItem. When the fallback mock was used as window.localStorage, calling window.localStorage.setItem(...) invoked the mock's own property, bypassing Storage.prototype entirely — so any test spy on Storage.prototype.setItem was never triggered.

The fallback mock is used when jsdom's localStorage is broken (e.g., Node 26 with jsdom 26.1.0 where --localstorage-file is not provided causes methods to throw or Storage to be a broken/noop object). In that case, the catch block in vitest.setup.ts assigns createStorageMock() to both globalThis.localStorage and window.localStorage.

The mock is created with Object.create(Storage.prototype) so it inherits from Storage.prototype. But because mock.setItem was an own property, it shadowed the prototype's setItem. The fix makes mock.setItem call Storage.prototype.setItem.call(this, key, value) before storing data locally — this ensures:

1. Prototype spies ARE triggered (Storage.prototype.setItem is called)
2. Data IS stored locally (data.set(...))
3. If the prototype call throws (e.g., test spy throws), the error propagates to the hook's try-catch in writeStoredMode

Key change:
```typescript
// Before (broken): own property that bypassed prototype
mock.setItem = function (key: string, value: string): void {
  data.set(key, String(value))
}

// After (fixed): own property that calls prototype, then stores locally
mock.setItem = function (key: string, value: string): void {
  Storage.prototype.setItem.call(this, key, String(value))
  data.set(key, String(value))
}
```
