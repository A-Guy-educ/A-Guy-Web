# LLS — Mobile Chat Toggle (REVISED - Critical Fixes)

**Status**: Draft - Fixing Critical Holes
**Revision**: 2.0
**Date**: 2026-01-26

---

## CRITICAL ISSUES IDENTIFIED & FIXES

### Issue 1: Mobile Definition is Wrong ❌

**Problem**: Using `viewport < 1024px` doesn't match GAP decision of "non-PC device"
- Desktop window resized to 800px → treated as mobile (WRONG)
- iPad landscape 1024px+ → treated as desktop (WRONG)
- Tablets are ambiguous

**Decision Required from Manager**:

Option A: Use actual device detection (user agent)
```typescript
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return /mobile|android|iphone|ipad|tablet/.test(ua)
}
```

Option B: Explicitly change GAP to use viewport breakpoint
- Update GAP.md to say "mobile = viewport < 1024px"
- Accept that resized desktop windows behave like mobile

**Recommended**: Option A (matches GAP intent) OR clarify GAP decision

---

### Issue 2: Chat State Retention WILL BREAK ❌

**Problem**: Different render trees unmount/remount chat component
```typescript
// PDF collapsed: Clone with different props (NEW TREE)
{React.cloneElement(chatContent, { showInputOnly: true })}

// PDF expanded: Original chatContent (DIFFERENT TREE)
{chatContent}

// Chat mode: Original chatContent (DIFFERENT TREE)
{chatContent}
```

**Result**: Switching modes → chat remounts → **loses input value, scroll position, internal state**

**Fix**: Render ChatInterface ONCE, keep mounted, control via CSS/layout

```typescript
// CORRECT APPROACH: Single chat instance, always mounted
<div className="flex flex-col h-full">
  {/* PDF Content - show/hide via CSS */}
  <div
    className={cn(
      viewMode === 'CHAT' && 'hidden'
    )}
  >
    {pdfContent}
  </div>

  {/* Chat Interface - ALWAYS RENDERED, never unmounted */}
  <div
    className={cn(
      // Position based on mode
      viewMode === 'CHAT' && 'h-full',
      viewMode === 'PDF' && !chatExpandedInPdf && 'h-auto', // Just input bar
      viewMode === 'PDF' && chatExpandedInPdf && 'h-1/2', // Split
    )}
  >
    {chatContent}
  </div>
</div>
```

**Better**: Use layout wrapper, not clone/conditional render

---

### Issue 3: Input Bar "Always Visible" Not Implemented ❌

**Problem**: ChatInterface doesn't have "input only" mode built-in
- Inventing new rendering mode on the fly
- May break existing chat behavior
- Duplicate input implementations

**Fix**:
1. Check if ChatInterface already supports partial rendering
2. If not, modify it properly with clear contracts
3. Ensure same input component/state in all modes

**Question for Implementation**: Does ChatInterface already have this capability?

---

### Issue 4: Header Toggle Positioning is Broken ❌

**Problem**:
```typescript
isRTL ? 'left-[50%]' : 'right-[50%]'
```
- 50% is CENTER, collides with centered title
- RTL logic makes no sense (flips left/right but stays at 50%?)

**Fix**: Define actual layout slots

```typescript
// Option A: Next to menu button
<header className="h-[60px] flex items-center justify-between px-4">
  {/* Back arrow - left */}
  <Link href="..." className="w-10">
    <ArrowLeft />
  </Link>

  {/* Title - center (flex-1) */}
  <h1 className="flex-1 text-center truncate mx-4">
    {title}
  </h1>

  {/* Right side: Toggle + Menu */}
  <div className="flex items-center gap-2">
    {isMobile && (
      <button onClick={onModeToggle}>
        {viewMode === 'PDF' ? <MessageSquare /> : <FileText />}
      </button>
    )}
    <button onClick={openMenu}>
      <Menu />
    </button>
  </div>
</header>
```

**Layout**: `[←] [--------Title--------] [Toggle][☰]`

---

### Issue 5: ResizablePane Persistence Violates "No Persistence" ❌

**Problem**:
```typescript
storageKey="exercise-split-size-mobile"
```
- GAP says: "no cross-page or cross-session persistence"
- But they add localStorage persistence for split size

**Decision Required**:

Option A: Remove storageKey (matches GAP)
```typescript
<ResizablePane
  orientation="vertical"
  defaultSize={50}
  // NO storageKey - resets every page load
>
```

Option B: Explicitly approve split size persistence as "already supported"
- Desktop already uses `storageKey="exercise-split-size"`
- Mobile can match this behavior

**Recommended**: Option B (UX consistency) OR clarify GAP

---

### Issue 6: ResizablePane Orientation May Be Wrong ❌

**Problem**: `orientation="vertical"` may mean left/right, not top/bottom
- Need to verify this codebase's ResizablePane semantics
- Could ship with inverted panes

**Fix**: Check existing ResizablePane usage in codebase

```bash
# Find how orientation is used currently
grep -r "orientation=" --include="*.tsx" | grep ResizablePane
```

**Action Required**: Verify before implementation

---

## CORRECTED IMPLEMENTATION

### Revised ExerciseWorkspace (Mobile Path Only)

```typescript
// Mobile: mode-based rendering - CORRECTED
return (
  <div className="flex flex-col h-screen">
    <ExerciseHeader {...headerProps} />

    <div className="flex-1 overflow-hidden relative">
      {/* PDF Layer - show/hide via CSS, never unmount */}
      <div
        className={cn(
          'absolute inset-0 bg-muted flex items-center justify-center',
          viewMode === 'CHAT' && 'hidden',
          chatExpandedInPdf && 'h-1/2', // Top half when split
        )}
      >
        {pdfContent}
      </div>

      {/* Chat Layer - ALWAYS RENDERED, never unmount */}
      <div
        className={cn(
          'absolute bg-background flex flex-col',
          // Full screen in chat mode
          viewMode === 'CHAT' && 'inset-0',
          // Bottom portion when expanded in PDF mode
          viewMode === 'PDF' && chatExpandedInPdf && 'inset-x-0 bottom-0 h-1/2',
          // Bottom bar only when collapsed in PDF mode
          viewMode === 'PDF' && !chatExpandedInPdf && 'inset-x-0 bottom-0 h-auto',
        )}
      >
        {/* ChatInterface rendered ONCE, same instance always */}
        {React.cloneElement(chatContent as React.ReactElement, {
          // Pass mode hint to ChatInterface
          displayMode: viewMode === 'PDF' && !chatExpandedInPdf ? 'input-only' : 'full',
          onInteraction: handleChatExpand,
        })}
      </div>
    </div>
  </div>
)
```

**Key Changes**:
1. Both PDF and Chat are in DOM always
2. CSS controls visibility/positioning
3. ChatInterface is single instance (never remounts)
4. State is preserved across all mode switches

---

### Revised ChatInterface Props

```typescript
interface ChatInterfaceProps {
  exerciseId?: string
  lessonId?: string
  // NEW: Display mode hint (not conditional rendering)
  displayMode?: 'full' | 'input-only'
  // Interaction callback
  onInteraction?: () => void
}

export function ChatInterface({
  exerciseId,
  lessonId,
  displayMode = 'full',
  onInteraction,
}: ChatInterfaceProps) {
  // ALL hooks always called (no conditional rendering)
  const { messages, inputValue, setInputValue, ... } = useNotebookChat(...)

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (onInteraction && value.length > 0) {
      onInteraction()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages - hide via CSS when in input-only mode */}
      <div className={cn(
        'flex-1 overflow-y-auto p-4',
        displayMode === 'input-only' && 'hidden'
      )}>
        <MessageList messages={messages} />
      </div>

      {/* Input - ALWAYS rendered, same instance */}
      <div className="p-4 border-t">
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
```

**Key Changes**:
1. No conditional rendering of different trees
2. CSS hides messages in input-only mode
3. Same input component in all modes
4. All hooks always called

---

### Revised ExerciseHeader Layout

```typescript
export default function ExerciseHeader({
  title,
  courseSlug,
  chapterSlug,
  lessonSlug,
  isRTL = false,
  isMobile,
  viewMode,
  onModeToggle,
}: ExerciseHeaderProps) {
  const t = useTranslations('exercises')

  return (
    <header className="h-[60px] bg-background border-b">
      <div className={cn(
        'h-full flex items-center justify-between px-4',
        isRTL && 'flex-row-reverse'
      )}>
        {/* Back arrow - left side */}
        <Link
          href={`/courses/${courseSlug}/chapters/${chapterSlug}/lessons/${lessonSlug}`}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>

        {/* Title - center with flex-1 */}
        <h1 className="flex-1 text-center text-lg font-semibold truncate px-4">
          {title}
        </h1>

        {/* Right side: Toggle (mobile) + Menu/Logo (both) */}
        <div className={cn(
          'flex items-center gap-3 flex-shrink-0',
          isRTL && 'flex-row-reverse'
        )}>
          {/* Mobile toggle */}
          {isMobile && (
            <button
              onClick={onModeToggle}
              className="p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
              aria-label={viewMode === 'PDF' ? t('switchToChat') : t('switchToPdf')}
            >
              {viewMode === 'PDF' ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Desktop logo OR mobile menu */}
          {isDesktop ? (
            <TelescopeLogo />
          ) : (
            <button onClick={openMenu} className="p-2">
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
```

**Layout**:
- LTR: `[←] [--------Title--------] [Toggle?] [Logo/Menu]`
- RTL: `[Logo/Menu] [Toggle?] [--------Title--------] [→]`

---

## DECISIONS REQUIRED FROM MANAGER

### 1. Mobile Definition
- [ ] **Option A**: Use user agent detection (matches GAP "non-PC device")
- [ ] **Option B**: Change GAP to explicitly say "viewport < 1024px"

### 2. State Persistence
- [ ] **Option A**: No persistence for split size (strict GAP interpretation)
- [ ] **Option B**: Allow split size persistence (matches desktop behavior)

### 3. ResizablePane Orientation
- [ ] Verify orientation semantics in codebase before proceeding
- [ ] Test with existing usage to confirm top/bottom vs left/right

---

## TESTING ADDITIONS

### Test Chat State Retention (CRITICAL)

```typescript
test('should preserve chat input when switching modes', () => {
  render(<ExerciseWorkspace {...mockProps} />)

  // Type in PDF mode
  const input = screen.getByTestId('chat-input')
  fireEvent.change(input, { target: { value: 'Test message' } })

  // Toggle to chat mode
  fireEvent.click(screen.getByLabelText(/switch to chat/i))

  // Verify SAME input element (not remounted)
  expect(screen.getByTestId('chat-input')).toBe(input)
  expect(input).toHaveValue('Test message')

  // Toggle back to PDF
  fireEvent.click(screen.getByLabelText(/switch to content/i))

  // Verify STILL same input element
  expect(screen.getByTestId('chat-input')).toBe(input)
  expect(input).toHaveValue('Test message')
})

test('should preserve chat scroll position when switching modes', () => {
  render(<ExerciseWorkspace {...mockProps} />)

  const messagesContainer = screen.getByTestId('chat-messages')
  messagesContainer.scrollTop = 100

  // Toggle modes
  fireEvent.click(screen.getByLabelText(/switch to chat/i))
  fireEvent.click(screen.getByLabelText(/switch to content/i))

  // Scroll position preserved (same DOM element)
  expect(messagesContainer.scrollTop).toBe(100)
})
```

---

## IMPLEMENTATION BLOCKERS

**Cannot proceed until**:
1. Manager decides mobile definition (user agent OR viewport)
2. Manager approves/rejects split size persistence
3. Verify ResizablePane orientation semantics
4. Confirm ChatInterface can support displayMode prop pattern

---

## REVISED TIMELINE

Original: 8-12 hours
**With Fixes**: 10-14 hours (additional complexity for state retention)

---

**Status**: ⚠️ BLOCKED - Awaiting Manager Decisions
**Critical Fixes**: State retention, mobile definition, header layout
**Last Updated**: 2026-01-26
