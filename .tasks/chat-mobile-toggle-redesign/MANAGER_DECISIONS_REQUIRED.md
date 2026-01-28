# Manager Decisions Required - Mobile Chat Toggle

**Date**: 2026-01-26
**Status**: BLOCKED - Awaiting Decisions

---

## Summary

The original LLS has critical holes that will break the GAP/HLS requirements. I've identified all issues and created fixes, but need your decisions on 2 critical questions before implementation can proceed.

---

## ✅ RESOLVED (No Decision Needed)

### ResizablePane Orientation - VERIFIED CORRECT
**Manager Concern**: "vertical" might mean left/right instead of top/bottom

**Investigation Results**:
```typescript
// From ResizablePane component (line 67-78, 124):
if (orientation === 'horizontal') {
  // Uses flex-row → left/right split (PDF left, chat right)
  percentage = ((clientX - rect.left) / rect.width) * 100
} else {
  // Uses flex-col → top/bottom split (PDF top, chat bottom)
  percentage = ((clientY - rect.top) / rect.height) * 100
}
```

**Current Usage** (ExerciseWorkspace line 37):
```typescript
orientation={isDesktop ? 'horizontal' : 'vertical'}
//            Desktop: left/right  Mobile: top/bottom ✅
```

**Conclusion**: Original LLS was CORRECT. `orientation="vertical"` does create top/bottom split.

---

## ❌ DECISION 1: Mobile Device Definition (CRITICAL)

### The Problem
**GAP Decision**: "Mobile = any non-PC device (phones, tablets)"
**Original LLS**: `viewport < 1024px`

**These are NOT the same**:
- Desktop browser resized to 800px → treated as mobile ❌
- iPad landscape (1194px) → treated as desktop ❌
- Tablet devices ambiguous

### Options

**Option A: User Agent Detection** (Matches GAP intent)
```typescript
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return /mobile|android|iphone|ipad|tablet/.test(ua)
}
```
✅ Matches "non-PC device" definition
❌ Less reliable (can be spoofed)
❌ Doesn't handle "desktop mode" on tablets

**Option B: Change GAP to Use Viewport** (Simpler, more predictable)
```typescript
// Update GAP.md to explicitly say:
// "Mobile = viewport < 1024px (regardless of device type)"
```
✅ Consistent with existing useMediaQuery
✅ Predictable behavior
✅ Easier to test
❌ Violates current GAP wording

**Option C: Hybrid Approach**
```typescript
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isNarrowViewport = window.innerWidth < 1024
  return isTouchDevice && isNarrowViewport
}
```
✅ More accurate
❌ More complex

### Your Decision Required
- [ ] **Option A** - User agent detection
- [ ] **Option B** - Update GAP to use viewport width (recommended)
- [ ] **Option C** - Hybrid touch + viewport
- [ ] **Other** - Specify your preference

**Recommended**: Option B (update GAP, use viewport) - simplest and most testable.

---

## ❌ DECISION 2: Split Size Persistence

### The Problem
**GAP Decision**: "No cross-page or cross-session persistence"
**Current Implementation**: ExerciseWorkspace ALREADY uses `storageKey="exercise-split-size"`

**Existing Code** (ExerciseWorkspace line 41):
```typescript
<ResizablePane
  orientation={isDesktop ? 'horizontal' : 'vertical'}
  storageKey="exercise-split-size" // ← Already persists!
>
```

**This means**:
- Desktop split size is ALREADY persisted across sessions
- Mobile split size is ALREADY persisted across sessions (when expanded)
- This has been shipping for weeks/months

### Options

**Option A: Remove Persistence** (Strict GAP interpretation)
```typescript
<ResizablePane
  orientation={isDesktop ? 'horizontal' : 'vertical'}
  // NO storageKey - resets every page load
>
```
✅ Matches GAP wording
❌ Breaks existing desktop behavior (regression)
❌ Worse UX (users re-adjust split every time)

**Option B: Keep Existing Persistence** (Practical approach)
```typescript
// Update GAP.md to say:
// "No persistence EXCEPT split pane size (already supported)"
<ResizablePane
  storageKey="exercise-split-size" // Keep existing
>
```
✅ No regression
✅ Consistent UX desktop/mobile
✅ Matches what's already shipping
❌ Contradicts GAP as written

**Option C: Desktop Only Persistence**
```typescript
<ResizablePane
  storageKey={isDesktop ? "exercise-split-size" : undefined}
>
```
✅ Keeps desktop behavior
❌ Inconsistent between desktop/mobile
❌ Users re-adjust split on mobile every time

### Your Decision Required
- [ ] **Option A** - Remove all persistence (strict GAP)
- [ ] **Option B** - Keep persistence, update GAP (recommended)
- [ ] **Option C** - Desktop only persistence
- [ ] **Other** - Specify your preference

**Recommended**: Option B (keep existing, update GAP) - avoids regression and matches current behavior.

---

## ✅ CRITICAL FIX: Chat State Retention (IMPLEMENTED IN REVISED LLS)

### The Problem
Original LLS **WILL BREAK** chat state:
```typescript
// Different render trees → remounting → state loss
{chatExpandedInPdf ? chatContent : React.cloneElement(chatContent, ...)}
```

### The Fix (Already in LLS_REVISED.md)
```typescript
// ALWAYS render chat, never unmount, control via CSS
<div className={cn(
  'absolute bg-background',
  viewMode === 'CHAT' && 'inset-0',              // Full screen
  viewMode === 'PDF' && chatExpandedInPdf && 'h-1/2 bottom-0', // Split
  viewMode === 'PDF' && !chatExpandedInPdf && 'h-auto bottom-0', // Bar only
)}>
  {/* Single instance, never remounts */}
  {chatContent}
</div>
```

**Result**: Input value, scroll position, all internal state preserved ✅

---

## ✅ FIXED: Header Layout (IMPLEMENTED IN REVISED LLS)

### The Problem
Original: `right-[50%]` (50% = center, collides with title)

### The Fix
```typescript
<header className="flex justify-between">
  <Link>← Back</Link>
  <h1 className="flex-1 text-center">Title</h1>
  <div className="flex gap-2">
    {isMobile && <button>Toggle</button>}
    <button>☰ Menu</button>
  </div>
</header>
```

**Layout**: `[←] [--------Title--------] [Toggle][☰]` ✅

---

## Minor Issues (Not Blocking)

### SSR/Hydration Mismatch
- Fixed by using `useMediaQuery` consistently
- Initial render uses default, then syncs client-side

### Test IDs Don't Exist
- Need to add `data-testid` attributes to components before tests can run
- Not blocking implementation, just test writing

### a11y Role Misuse
- Changed from `role="switch"` to regular button with `aria-pressed`
- More semantically correct

---

## Next Steps

### If You Approve Both Recommendations:
1. ✅ Update GAP.md:
   - Change "non-PC device" to "viewport < 1024px"
   - Add exception: "Split pane size persists (existing behavior)"

2. ✅ Implement from LLS_REVISED.md:
   - Use viewport width for mobile detection
   - Keep `storageKey="exercise-split-size"`
   - Use CSS-based show/hide (no remounting)
   - Use proper header layout (no 50% hacks)

3. ✅ Timeline: 10-14 hours (revised estimate)

### If You Reject Recommendations:
- Specify your preferred options for Decision 1 & 2
- I'll update LLS_REVISED.md accordingly
- May require additional GAP updates

---

## Files to Review

1. **[LLS_REVISED.md](.tasks/chat-mobile-toggle-redesign/LLS_REVISED.md)** - Corrected implementation with all fixes
2. **[CHAT_COMPARISON_FOR_PM.md](.tasks/chat-mobile-toggle-redesign/CHAT_COMPARISON_FOR_PM.md)** - For designer question (unrelated, but done)
3. **Original LLS** - Has critical holes, do NOT use

---

## Your Action Required

Please respond with:
- [ ] Decision 1: Mobile definition (A, B, or C)
- [ ] Decision 2: Persistence (A, B, or C)
- [ ] Approval to update GAP.md (if needed)
- [ ] Approval to proceed with implementation

---

**Status**: ⚠️ BLOCKED until decisions made
**Estimated Response Time Needed**: 5-10 minutes to review and decide
**Implementation Can Start**: Within 1 hour after approval
