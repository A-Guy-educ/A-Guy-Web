# LLS — Mobile Chat Toggle (Mode-Based Implementation)

**Status**: Ready for Implementation
**Based on**: HLS (approved), GAP (resolved)
**Architecture Review**: Complete

---

## 1. Executive Summary

Implement a mobile-only mode switching system that allows users to toggle between full-screen PDF content and full-screen chat. The implementation modifies the existing `ExerciseWorkspace` component to support three distinct states on mobile devices while preserving all existing desktop behavior and chat functionality.

---

## 2. Architecture Overview

### 2.1 Modified Components

| Component | Path | Modification Type |
|-----------|------|-------------------|
| `ExerciseWorkspace` | `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseId]/_components/ExerciseWorkspace/index.tsx` | **Major** - Add mode state, conditional rendering |
| `ExerciseHeader` | `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseId]/_components/ExerciseHeader/index.tsx` | **Minor** - Add toggle button (mobile only) |
| `ChatInterface` | `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseId]/_components/ChatInterface/index.tsx` | **Minor** - Accept new props for split trigger |

### 2.2 New Files

| File | Purpose |
|------|---------|
| `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseId]/_components/ExerciseWorkspace/exercise-workspace-types.ts` | Type definitions for modes and state |
| `src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseId]/_components/ExerciseWorkspace/exercise-workspace-utils.ts` | Device detection, mode validation |

### 2.3 State Management Strategy

**Location**: ExerciseWorkspace component (local state)

```typescript
// Local state (no context needed for page-scoped behavior)
const [viewMode, setViewMode] = useState<ViewMode>('PDF')
const [chatExpandedInPdf, setChatExpandedInPdf] = useState(false)
```

**Why local state?**
- State is page-scoped (resets on navigation per GAP.md)
- No cross-component communication needed
- Simpler implementation, easier to reason about
- Matches existing pattern (useNotebookChat is also local)

---

## 3. Type Definitions

### 3.1 File: `exercise-workspace-types.ts`

```typescript
/**
 * View mode for mobile devices
 * PDF: Content visible, chat input bar visible, chat messages hidden
 * CHAT: Chat visible full-screen, content hidden
 */
export type ViewMode = 'PDF' | 'CHAT'

/**
 * Device classification for responsive behavior
 */
export type DeviceType = 'mobile' | 'desktop'

/**
 * State model for ExerciseWorkspace
 */
export interface ExerciseWorkspaceState {
  /** Current view mode (mobile only) */
  viewMode: ViewMode
  /** Whether chat is expanded in PDF mode (mobile only) */
  chatExpandedInPdf: boolean
  /** Device type detected from viewport */
  deviceType: DeviceType
}

/**
 * Props for ExerciseWorkspace component
 */
export interface ExerciseWorkspaceProps {
  /** PDF or exercise content to display */
  pdfContent: React.ReactNode
  /** Chat interface component */
  chatContent: React.ReactNode
  /** Exercise title for header */
  exerciseTitle: string
  /** Course slug for navigation */
  courseSlug: string
  /** Chapter slug for navigation */
  chapterSlug: string
  /** Lesson slug for navigation */
  lessonSlug: string
  /** Optional RTL flag */
  isRTL?: boolean
}
```

---

## 4. Utility Functions

### 4.1 File: `exercise-workspace-utils.ts`

```typescript
import type { DeviceType } from './exercise-workspace-types'

/**
 * Detect if current device is mobile based on viewport width
 * Uses same breakpoint as existing useMediaQuery: 1024px
 *
 * @returns 'mobile' if viewport < 1024px, 'desktop' otherwise
 */
export function getDeviceType(viewportWidth: number): DeviceType {
  return viewportWidth < 1024 ? 'mobile' : 'desktop'
}

/**
 * Check if device is mobile using window.innerWidth
 * Used for SSR-safe initial render
 *
 * @returns boolean indicating if mobile (< 1024px)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 1024
}

/**
 * Get initial view mode on page load
 * Always returns 'PDF' per HLS requirement
 */
export function getInitialViewMode(): 'PDF' {
  return 'PDF'
}
```

---

## 5. Component Implementation

### 5.1 ExerciseWorkspace (Modified)

**File**: `ExerciseWorkspace/index.tsx`

**Changes Required**:

1. **Add imports**:
```typescript
import { useState, useCallback } from 'react'
import type { ViewMode } from './exercise-workspace-types'
import { getInitialViewMode, isMobileDevice } from './exercise-workspace-utils'
```

2. **Add state initialization**:
```typescript
'use client'

export default function ExerciseWorkspace({
  pdfContent,
  chatContent,
  exerciseTitle,
  courseSlug,
  chapterSlug,
  lessonSlug,
  isRTL = false,
}: ExerciseWorkspaceProps) {
  // Existing code
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // NEW: Mobile mode state
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode())
  const [chatExpandedInPdf, setChatExpandedInPdf] = useState(false)

  // NEW: Mode toggle handler
  const handleModeToggle = useCallback(() => {
    setViewMode((prev) => {
      const newMode = prev === 'PDF' ? 'CHAT' : 'PDF'

      // When switching to PDF mode, collapse any expanded chat
      if (newMode === 'PDF') {
        setChatExpandedInPdf(false)
      }

      return newMode
    })
  }, [])

  // NEW: Chat expand handler (triggered by user typing/sending message)
  const handleChatExpand = useCallback(() => {
    if (!isDesktop && viewMode === 'PDF') {
      setChatExpandedInPdf(true)
    }
  }, [isDesktop, viewMode])
```

3. **Add conditional rendering logic**:
```typescript
  // Desktop: use existing ResizablePane layout (unchanged)
  if (isDesktop) {
    return (
      <div className="flex flex-col h-screen">
        <ExerciseHeader
          title={exerciseTitle}
          courseSlug={courseSlug}
          chapterSlug={chapterSlug}
          lessonSlug={lessonSlug}
          isRTL={isRTL}
          isMobile={false}
          viewMode={viewMode}
          onModeToggle={handleModeToggle}
        />

        <div className="flex-1 overflow-hidden">
          <ResizablePane
            orientation="horizontal"
            defaultSize={70}
            minSize={20}
            maxSize={80}
            storageKey="exercise-split-size"
          >
            <div className="bg-muted flex items-center justify-center h-full overflow-hidden">
              {pdfContent}
            </div>
            <div className="bg-background flex flex-col overflow-hidden h-full">
              {chatContent}
            </div>
          </ResizablePane>
        </div>
      </div>
    )
  }

  // Mobile: mode-based rendering
  return (
    <div className="flex flex-col h-screen">
      <ExerciseHeader
        title={exerciseTitle}
        courseSlug={courseSlug}
        chapterSlug={chapterSlug}
        lessonSlug={lessonSlug}
        isRTL={isRTL}
        isMobile={true}
        viewMode={viewMode}
        onModeToggle={handleModeToggle}
      />

      <div className="flex-1 overflow-hidden">
        {viewMode === 'CHAT' ? (
          // CHAT MODE: Full-screen chat
          <div className="bg-background flex flex-col h-full">
            {chatContent}
          </div>
        ) : (
          // PDF MODE: Full-screen PDF with optional split
          <>
            {chatExpandedInPdf ? (
              // Split layout: PDF on top, chat on bottom
              <ResizablePane
                orientation="vertical"
                defaultSize={50}
                minSize={20}
                maxSize={80}
                storageKey="exercise-split-size-mobile"
              >
                <div className="bg-muted flex items-center justify-center h-full overflow-hidden">
                  {pdfContent}
                </div>
                <div className="bg-background flex flex-col overflow-hidden h-full">
                  {chatContent}
                </div>
              </ResizablePane>
            ) : (
              // Collapsed: PDF full-screen with chat input bar at bottom
              <div className="flex flex-col h-full">
                <div className="flex-1 bg-muted flex items-center justify-center overflow-hidden">
                  {pdfContent}
                </div>
                <div className="bg-background">
                  {/* Clone chat content but only render input bar */}
                  {React.cloneElement(chatContent as React.ReactElement, {
                    onChatInteraction: handleChatExpand,
                    showMessagesOnly: false,
                    showInputOnly: true,
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

**Key Design Decisions**:
- Desktop code path is **completely unchanged** (no regression risk)
- Mobile uses explicit mode checks (`viewMode === 'CHAT'`)
- Chat state is preserved across all mode switches (no component unmounting)
- `chatExpandedInPdf` state is separate from `viewMode` (typing doesn't change mode)
- ResizablePane reused for split layout (no new layout component needed)

---

### 5.2 ExerciseHeader (Modified)

**File**: `ExerciseHeader/index.tsx`

**Changes Required**:

1. **Add new props**:
```typescript
interface ExerciseHeaderProps {
  title: string
  courseSlug: string
  chapterSlug: string
  lessonSlug: string
  isRTL?: boolean
  // NEW props
  isMobile: boolean
  viewMode: ViewMode
  onModeToggle: () => void
}
```

2. **Add toggle button (mobile only)**:
```typescript
import { MessageSquare, FileText } from 'lucide-react'

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
    <header className="h-[60px] bg-background border-b relative flex items-center px-4">
      {/* Back arrow - existing code */}
      <Link
        href={`/courses/${courseSlug}/chapters/${chapterSlug}/lessons/${lessonSlug}`}
        className={cn(
          'absolute',
          isRTL ? 'right-5' : 'left-5'
        )}
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>

      {/* Title - existing code */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold truncate max-w-[60%]">
        {title}
      </h1>

      {/* NEW: Mobile toggle button (center-right position) */}
      {isMobile && (
        <button
          onClick={onModeToggle}
          className={cn(
            'absolute flex items-center gap-2 px-3 py-1.5 rounded-md',
            'bg-muted hover:bg-muted/80 transition-colors',
            'text-sm font-medium',
            isRTL ? 'left-[50%]' : 'right-[50%]'
          )}
          aria-label={viewMode === 'PDF' ? t('switchToChat') : t('switchToPdf')}
        >
          {viewMode === 'PDF' ? (
            <>
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{t('chat')}</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t('content')}</span>
            </>
          )}
        </button>
      )}

      {/* Logo - existing code (desktop only) */}
      <div
        className={cn('fixed z-[101] hidden lg:flex', isRTL ? 'left-5' : 'right-5')}
      >
        <TelescopeLogo />
      </div>

      {/* Menu button - existing code (mobile only) */}
      <button
        className={cn('lg:hidden absolute', isRTL ? 'left-5' : 'right-5')}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('open-mobile-menu'))
        }}
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  )
}
```

**Visual Layout** (mobile header):
```
[←] [----------------Title----------------] [Toggle] [☰]
     Back                                   PDF/Chat  Menu
```

---

### 5.3 ChatInterface (Modified)

**File**: `ChatInterface/index.tsx`

**Changes Required**:

1. **Add new optional props**:
```typescript
interface ChatInterfaceProps {
  exerciseId?: string
  lessonId?: string
  // NEW props for mobile mode support
  onChatInteraction?: () => void
  showMessagesOnly?: boolean
  showInputOnly?: boolean
}
```

2. **Add interaction trigger**:
```typescript
export default function ChatInterface({
  exerciseId,
  lessonId,
  onChatInteraction,
  showMessagesOnly = false,
  showInputOnly = false,
}: ChatInterfaceProps) {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    handleSend,
    handleReset,
    handleQuickAction,
  } = useNotebookChat({ exerciseId, lessonId })

  // Trigger interaction callback when user types or sends
  const handleInputChange = (value: string) => {
    setInputValue(value)
    // Notify parent that user is interacting with chat
    if (onChatInteraction && value.length > 0) {
      onChatInteraction()
    }
  }

  const handleSendWithInteraction = async () => {
    if (onChatInteraction) {
      onChatInteraction()
    }
    await handleSend()
  }

  // Conditional rendering based on mobile mode
  if (showInputOnly) {
    return (
      <div className="p-4 border-t">
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendWithInteraction}
          isLoading={isLoading}
          placeholder={t('typeMessage')}
        />
      </div>
    )
  }

  // Full chat interface (default)
  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t">
        <QuickActions onAction={handleQuickAction} />
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendWithInteraction}
          isLoading={isLoading}
          placeholder={t('typeMessage')}
        />
      </div>
    </div>
  )
}
```

**Key Design Decisions**:
- `showInputOnly` prop allows rendering just the input bar in PDF mode (collapsed)
- `onChatInteraction` callback triggers split expansion in parent
- Full chat state is always maintained (no conditional hook calls)
- Component remains fully functional in all render modes

---

## 6. Translation Keys

**File**: `messages/en.json`

Add to `exercises` section:
```json
{
  "exercises": {
    "switchToChat": "Switch to chat view",
    "switchToPdf": "Switch to content view",
    "chat": "Chat",
    "content": "Content"
  }
}
```

**File**: `messages/he.json`

Add to `exercises` section:
```json
{
  "exercises": {
    "switchToChat": "עבור לתצוגת צ'אט",
    "switchToPdf": "עבור לתצוגת תוכן",
    "chat": "צ'אט",
    "content": "תוכן"
  }
}
```

---

## 7. State Transition Diagram

```
Mobile Device Entry (viewMode = 'PDF', chatExpandedInPdf = false)
                          |
                          v
         ┌────────────────────────────────┐
         │      PDF Mode (Collapsed)      │
         │  - PDF fills screen            │
         │  - Chat input bar visible      │
         │  - No chat messages            │
         └────────────────────────────────┘
                  │              │
    User types/   │              │  User clicks
    sends msg     │              │  toggle button
                  v              v
    ┌──────────────────┐   ┌──────────────────┐
    │  PDF Mode        │   │    Chat Mode     │
    │  (Expanded)      │   │                  │
    │  - PDF on top    │   │  - Chat fills    │
    │  - Chat on btm   │   │    screen        │
    │  - Resizable     │   │  - PDF hidden    │
    └──────────────────┘   └──────────────────┘
         │                        │
         │ Toggle                 │ Toggle
         │ button                 │ button
         v                        v
    Returns to collapsed       Returns to
    PDF mode                   collapsed PDF mode
```

**Explicit State Rules**:
1. Page entry → `viewMode = 'PDF'`, `chatExpandedInPdf = false`
2. Toggle click → flip `viewMode`, reset `chatExpandedInPdf = false`
3. Typing in PDF mode → set `chatExpandedInPdf = true` (no mode change)
4. Navigation away → all state is lost (page-scoped)

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File**: `ExerciseWorkspace/exercise-workspace.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import ExerciseWorkspace from './index'

describe('ExerciseWorkspace - Mobile Mode Toggle', () => {
  const mockProps = {
    pdfContent: <div data-testid="pdf-content">PDF</div>,
    chatContent: <div data-testid="chat-content">Chat</div>,
    exerciseTitle: 'Test Exercise',
    courseSlug: 'math-101',
    chapterSlug: 'algebra',
    lessonSlug: 'equations',
  }

  beforeEach(() => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  it('should render in PDF mode by default on mobile', () => {
    render(<ExerciseWorkspace {...mockProps} />)

    expect(screen.getByTestId('pdf-content')).toBeInTheDocument()
    expect(screen.getByLabelText(/switch to chat/i)).toBeInTheDocument()
  })

  it('should toggle to chat mode when button clicked', () => {
    render(<ExerciseWorkspace {...mockProps} />)

    const toggleButton = screen.getByLabelText(/switch to chat/i)
    fireEvent.click(toggleButton)

    expect(screen.getByTestId('chat-content')).toBeVisible()
    expect(screen.queryByTestId('pdf-content')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/switch to content/i)).toBeInTheDocument()
  })

  it('should preserve chat state when toggling modes', async () => {
    render(<ExerciseWorkspace {...mockProps} />)

    // Type message in PDF mode
    const input = screen.getByPlaceholderText(/type message/i)
    fireEvent.change(input, { target: { value: 'Test message' } })

    // Toggle to chat mode
    fireEvent.click(screen.getByLabelText(/switch to chat/i))

    // Toggle back to PDF mode
    fireEvent.click(screen.getByLabelText(/switch to content/i))

    // Input value should be preserved
    expect(input).toHaveValue('Test message')
  })

  it('should not render toggle button on desktop', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    })

    render(<ExerciseWorkspace {...mockProps} />)

    expect(screen.queryByLabelText(/switch to/i)).not.toBeInTheDocument()
  })
})
```

### 8.2 Integration Tests

**File**: `tests/int/exercise-mobile-toggle.int.spec.ts`

```typescript
import { test, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExercisePage from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseId]/page'

test.describe('Exercise Mobile Toggle - Integration', () => {
  test('should expand chat when user starts typing in PDF mode', async () => {
    // Mock mobile device
    global.innerWidth = 768

    render(<ExercisePage params={{ exerciseId: 'test-123' }} />)

    // Initial state: PDF mode, collapsed
    expect(screen.getByTestId('pdf-content')).toBeVisible()
    expect(screen.getByTestId('chat-input')).toBeVisible()
    expect(screen.queryByTestId('chat-messages')).not.toBeInTheDocument()

    // User types in input
    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'Help me' } })

    // Chat should expand into split layout
    await waitFor(() => {
      expect(screen.getByTestId('chat-messages')).toBeVisible()
    })

    // PDF should still be visible (split layout)
    expect(screen.getByTestId('pdf-content')).toBeVisible()
  })

  test('should collapse split when toggling back to PDF mode', async () => {
    global.innerWidth = 768

    render(<ExercisePage params={{ exerciseId: 'test-123' }} />)

    // Expand chat by typing
    fireEvent.change(screen.getByTestId('chat-input'), {
      target: { value: 'Test' }
    })
    await waitFor(() => {
      expect(screen.getByTestId('chat-messages')).toBeVisible()
    })

    // Toggle to chat mode
    fireEvent.click(screen.getByLabelText(/switch to chat/i))

    // Toggle back to PDF mode
    fireEvent.click(screen.getByLabelText(/switch to content/i))

    // Should return to collapsed state
    expect(screen.queryByTestId('chat-messages')).not.toBeInTheDocument()
    expect(screen.getByTestId('chat-input')).toBeVisible()
  })
})
```

### 8.3 E2E Tests (Playwright)

**File**: `tests/e2e/exercise-mobile-toggle.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Exercise Mobile Toggle - E2E', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  })

  test('should toggle between PDF and chat modes on mobile', async ({ page }) => {
    await page.goto('/courses/math-101/chapters/algebra/lessons/quadratic/exercises/ex-1')

    // Initial state: PDF visible
    await expect(page.getByTestId('pdf-content')).toBeVisible()
    await expect(page.getByTestId('chat-input')).toBeVisible()

    // Click toggle to switch to chat
    await page.getByLabel('Switch to chat view').click()

    // PDF hidden, chat visible
    await expect(page.getByTestId('pdf-content')).not.toBeVisible()
    await expect(page.getByTestId('chat-messages')).toBeVisible()

    // Click toggle to switch back
    await page.getByLabel('Switch to content view').click()

    // PDF visible again
    await expect(page.getByTestId('pdf-content')).toBeVisible()
  })

  test('should expand chat when typing in PDF mode', async ({ page }) => {
    await page.goto('/courses/math-101/chapters/algebra/lessons/quadratic/exercises/ex-1')

    // Type in input
    await page.getByTestId('chat-input').fill('I need help')

    // Chat should expand
    await expect(page.getByTestId('chat-messages')).toBeVisible()

    // Both PDF and chat should be visible (split)
    await expect(page.getByTestId('pdf-content')).toBeVisible()
  })
})
```

### 8.4 Responsive Tests

**File**: `tests/e2e/exercise-responsive.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Exercise Responsive Behavior', () => {
  test('should not show toggle on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/courses/math-101/chapters/algebra/lessons/quadratic/exercises/ex-1')

    // Toggle should not exist
    await expect(page.getByLabel(/switch to/i)).not.toBeVisible()

    // Desktop split layout should render
    await expect(page.getByTestId('pdf-content')).toBeVisible()
    await expect(page.getByTestId('chat-messages')).toBeVisible()
  })

  test('should transition correctly when resizing from desktop to mobile', async ({ page }) => {
    // Start desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/courses/math-101/chapters/algebra/lessons/quadratic/exercises/ex-1')

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 })

    // Toggle should now appear
    await expect(page.getByLabel(/switch to/i)).toBeVisible()

    // Should be in PDF mode (default)
    await expect(page.getByTestId('pdf-content')).toBeVisible()
  })
})
```

---

## 9. Implementation Checklist

### Phase 1: Foundation
- [ ] Create `exercise-workspace-types.ts` with all type definitions
- [ ] Create `exercise-workspace-utils.ts` with device detection functions
- [ ] Add translation keys to `messages/en.json` and `messages/he.json`
- [ ] Update `ExerciseWorkspace` imports

### Phase 2: State Management
- [ ] Add `viewMode` and `chatExpandedInPdf` state to `ExerciseWorkspace`
- [ ] Implement `handleModeToggle` callback
- [ ] Implement `handleChatExpand` callback
- [ ] Test state transitions with console logs

### Phase 3: Conditional Rendering
- [ ] Add desktop rendering path (no changes to existing code)
- [ ] Add mobile Chat Mode rendering
- [ ] Add mobile PDF Mode (collapsed) rendering
- [ ] Add mobile PDF Mode (expanded split) rendering
- [ ] Test all render paths with mock props

### Phase 4: Header Toggle
- [ ] Add toggle button to `ExerciseHeader`
- [ ] Add mobile/desktop prop passing
- [ ] Add icons (MessageSquare, FileText from lucide-react)
- [ ] Test toggle button visibility and click behavior
- [ ] Test RTL layout

### Phase 5: Chat Integration
- [ ] Add `onChatInteraction` prop to `ChatInterface`
- [ ] Add `showInputOnly` prop support
- [ ] Implement input-only rendering mode
- [ ] Test interaction callback triggers
- [ ] Test state preservation

### Phase 6: Testing
- [ ] Write unit tests for `ExerciseWorkspace` component
- [ ] Write unit tests for utility functions
- [ ] Write integration tests for mode switching
- [ ] Write E2E tests for mobile flows
- [ ] Write responsive breakpoint tests
- [ ] Test with real device (iOS Safari, Android Chrome)

### Phase 7: Polish & QA
- [ ] Test with screen readers (accessibility)
- [ ] Test RTL layout (Hebrew locale)
- [ ] Test landscape orientation on mobile
- [ ] Verify no desktop regressions
- [ ] Test navigation behavior (state resets)
- [ ] Performance audit (no unnecessary re-renders)

---

## 10. Edge Cases & Error Handling

### 10.1 Viewport Resize During Session
**Scenario**: User starts on mobile, rotates device or resizes browser

**Handling**:
```typescript
// Add resize listener in ExerciseWorkspace
useEffect(() => {
  const handleResize = () => {
    const newDeviceType = isMobileDevice() ? 'mobile' : 'desktop'

    // Reset to default state on device type change
    if (newDeviceType === 'desktop' && !isDesktop) {
      setViewMode('PDF')
      setChatExpandedInPdf(false)
    }
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [isDesktop])
```

### 10.2 Chat Message Arrives While in PDF Mode
**Scenario**: AI response arrives while user is viewing PDF (collapsed)

**Handling**: No automatic mode switch. New messages are silently added to chat state. User sees them when they manually switch to chat mode or expand by typing.

### 10.3 Browser Back Button During Chat Mode
**Scenario**: User navigates away and presses back button

**Handling**: Page-scoped state is lost. User returns to default state (PDF mode, collapsed). This is expected behavior per GAP.md.

### 10.4 Very Small Screen Sizes (<375px)
**Scenario**: User on very narrow device

**Handling**: Toggle button label hidden via `hidden sm:inline`. Icon remains visible. Layout remains functional.

### 10.5 Disabled JavaScript
**Scenario**: User has JS disabled

**Handling**: Graceful degradation not required (app is React-based). Default server-rendered state shows PDF content. No toggle functionality available.

---

## 11. Performance Considerations

### 11.1 Avoid Unnecessary Re-renders
- Use `useCallback` for event handlers
- Memoize device type detection result
- Don't re-mount components when toggling (use CSS visibility)

### 11.2 State Storage
- No localStorage persistence (per HLS - page-scoped only)
- ResizablePane continues to use localStorage for split size preference

### 11.3 Bundle Size Impact
**Estimated additions**:
- New types file: ~300 bytes
- New utils file: ~400 bytes
- ExerciseWorkspace changes: ~1.5KB
- ExerciseHeader changes: ~800 bytes
- ChatInterface changes: ~600 bytes
- **Total**: ~3.6KB (gzipped: ~1.2KB)

**Impact**: Negligible. No new dependencies added.

---

## 12. Accessibility (a11y)

### 12.1 Toggle Button
```typescript
<button
  onClick={onModeToggle}
  aria-label={viewMode === 'PDF' ? t('switchToChat') : t('switchToPdf')}
  aria-pressed={viewMode === 'CHAT'}
  role="switch"
>
```

### 12.2 Screen Reader Announcements
```typescript
// Add live region for mode changes
<div
  role="status"
  aria-live="polite"
  className="sr-only"
>
  {viewMode === 'CHAT'
    ? t('chatModeActive')
    : t('pdfModeActive')
  }
</div>
```

Translation keys:
```json
{
  "exercises": {
    "chatModeActive": "Chat view active",
    "pdfModeActive": "Content view active"
  }
}
```

### 12.3 Keyboard Navigation
- Toggle button is keyboard accessible (native button element)
- Tab order: Back arrow → Toggle button → Menu button
- Enter/Space activates toggle

---

## 13. Deployment Notes

### 13.1 Feature Flag (Optional)
If gradual rollout desired, wrap mobile toggle in feature flag:

```typescript
// In ExerciseHeader
{isMobile && featureFlags.mobileToggle && (
  <button onClick={onModeToggle}>...</button>
)}
```

### 13.2 Rollback Plan
If issues arise in production:
1. Set feature flag to `false` (instant disable)
2. OR: Revert PR containing changes
3. Mobile users fall back to existing split layout behavior

### 13.3 Monitoring
Add analytics events:
```typescript
// Track mode switches
analytics.track('exercise_mode_toggle', {
  from: prevMode,
  to: newMode,
  deviceType: 'mobile',
  exerciseId,
})
```

---

## 14. Known Limitations

1. **No cross-page persistence**: Mode state resets on navigation (by design)
2. **No animation**: Mode switches are instant (by design per HLS)
3. **No gesture support**: Only button-based toggle (by design per GAP)
4. **No tablet-specific behavior**: Tablets treated as mobile (<1024px)

---

## 15. Future Enhancements (Out of Scope)

These are explicitly NOT included in this LLS:

- [ ] Persistent mode preference (localStorage/user settings)
- [ ] Swipe gestures to toggle modes
- [ ] Animated transitions between modes
- [ ] Picture-in-Picture chat overlay
- [ ] Split-screen mode on large tablets
- [ ] Auto-toggle based on chat activity

---

## 16. Definition of Done

This feature is complete when:

- [ ] All files in Section 3-5 are implemented
- [ ] All tests in Section 8 pass
- [ ] Desktop behavior is unchanged (verified in E2E tests)
- [ ] Mobile toggle works on iOS Safari and Android Chrome
- [ ] RTL layout functions correctly (Hebrew locale)
- [ ] Accessibility audit passes (WCAG 2.1 AA)
- [ ] Code review approved
- [ ] QA sign-off on test devices
- [ ] Translation keys added to both locales
- [ ] Documentation updated (if applicable)
- [ ] PR merged to dev branch

---

## 17. Implementation Timeline Estimate

**Total effort**: 8-12 hours for experienced developer

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1: Foundation | 1h | Type definitions, utils |
| Phase 2: State Management | 1.5h | State hooks, callbacks |
| Phase 3: Conditional Rendering | 2h | Mobile layout logic |
| Phase 4: Header Toggle | 1.5h | Button component, styling |
| Phase 5: Chat Integration | 1.5h | Props, callbacks, rendering modes |
| Phase 6: Testing | 2.5h | Unit, integration, E2E tests |
| Phase 7: Polish & QA | 1.5h | Accessibility, RTL, edge cases |

**Note**: This estimate assumes familiarity with the codebase and no blockers.

---

## 18. References

- **HLS**: `.tasks/chat-mobile-toggle-redesign/HLS.md`
- **GAP**: `.tasks/chat-mobile-toggle-redesign/GAP.md`
- **PRD**: `.tasks/chat-mobile-toggle-redesign/PRD.md`
- **CLAUDE_INTERNAL.md**: Project-specific conventions
- **AGENTS.md**: Architecture patterns and best practices
- **Architecture Report**: Agent exploration results (agent a2d2515)

---

**Document Status**: ✅ Ready for Implementation
**Last Updated**: 2026-01-26
**Author**: Claude Code (Sonnet 4.5)
