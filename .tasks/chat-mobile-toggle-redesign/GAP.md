# GAP — Mobile Chat Toggle (Mobile Only) — Resolved

## Purpose
This document captures the ambiguities identified in the PRD
“Mobile Chat Toggle (Open / Close Chat on Mobile Only)”
and records the **explicit decisions** made to close them.

This GAP is **fully resolved** and safe to feed into HLS / LLP.

---

## 1. Device Scope

**Question**
What is the exact definition of "mobile"?

**Answer**
- Mobile is defined as **viewport width < 1024px**
- Includes phones, tablets, and narrow browser windows
- Matches existing responsive breakpoint used throughout the app
- Desktop (≥1024px) retains existing split-screen behavior unchanged

**Technical Implementation**
- Uses `useMediaQuery('(min-width: 1024px)')` for consistent detection
- No user agent sniffing required
- Aligns with existing ResizablePane orientation logic

---

## 2. Chat Closed State

**Question**
What happens to the chat when it is closed?

**Answer**
- Chat must **retain all information and internal state**
- Messages, scroll position, and input state are preserved
- Chat is visually hidden but **not logically destroyed**

---

## 3. Open / Close Entry Points

**Question**
Where does the chat toggle live and how is it accessed?

**Answer**
- A single toggle exists in the **top header**
- The header toggle controls switching between PDF and Chat views
- No secondary toggles are allowed

---

## 4. Screen Ownership Rules

**Question**
What occupies the screen when chat is closed?

**Answer**
- When chat is closed (PDF Mode):
  - PDF / exercise content occupies the full screen
  - The chat **input bar remains visible** at the bottom
  - The chat message list is not visible

---

## 5. Interaction Between Chat and PDF

**Question**
What happens if the user types a message while chat is closed?

**Answer**
- While in PDF Mode:
  - Typing or sending a message expands the chat into a **split layout**
  - PDF appears on top, chat on the bottom
  - This matches the current implementation behavior
- This expansion does **not** change the explicit mode

---

## 6. Mode vs Overlay Model

**Question**
Is chat a mode, an overlay, or something else?

**Answer**
- Chat is an **explicit mode** on mobile
- Two modes exist:
  - PDF Mode
  - Chat Mode
- Partial or implicit states are not allowed outside the defined split behavior

---

## 7. State Transitions

**Question**
How are state transitions triggered?

**Answer**
- Mode changes occur **only via explicit user action**
- Controlled exclusively by the header toggle
- No automatic mode changes based on scroll or focus
- Typing expands chat within PDF Mode but does not switch modes

---

## 8. Gestures

**Question**
Are gesture-based interactions allowed?

**Answer**
- Gestures are **explicitly not allowed**
- No swipe to open
- No swipe to close

---

## 9. Animation & Transitions

**Question**
Should open/close transitions be animated?

**Answer**
- All transitions are **instant**
- No animation is used

---

## 10. State Scope

**Question**
How long does chat state persist?

**Answer**
- Chat mode state is **page-local**
- Navigating to a new page resets to default state
- No cross-page or cross-session persistence

**Exception: Split Pane Size**
- The split pane size (when chat is expanded in PDF mode) **IS persisted** via localStorage
- This matches existing behavior already shipping on both desktop and mobile
- Key: `exercise-split-size` (localStorage)
- User's preferred split ratio is remembered across sessions
- Only the view mode and expansion state reset on navigation

---

## 11. Desktop Boundary

**Question**
Does any of this apply to desktop?

**Answer**
- Desktop behavior is **unchanged**
- No toggle is shown
- Mobile chat logic is ignored on desktop

---

## 12. Default Entry State

**Question**
What is the default state on page load (mobile)?

**Answer**
- Default entry mode is **PDF Mode**
- Chat is not expanded
- Chat input bar is visible

---

## GAP Status

- All identified gaps are resolved
- Decisions are explicit and locked
- No remaining ambiguities block implementation
