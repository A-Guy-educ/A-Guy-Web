# Course Page Redesign — Implementation Plan

## Overview

Refactor the course page (`/courses/[courseSlug]`) UI to match the new Figma design reference while preserving all existing functionality, data fetching, routing, and business logic. This is a **visual-only** redesign affecting Tailwind classes, layout structure, and component styling — no backend, API, or data model changes.

**Design reference screenshot**: `.tasks/260310-auto-355/design-reference-full.png`

---

## Key Design Differences (Current → New)

Analyzing the Figma reference against current implementation:

| Area | Current | Design Reference |
|------|---------|-----------------|
| **Tabs** | Pill tabs in muted bg strip with border-bottom | Rounded pill tabs floating in a wider container, no border-bottom, cleaner separation |
| **Exam Reminder** | Chat-bubble style with avatar circle (right-aligned) | Centered red/primary badge pill ("עוד 3 ימים לבחינה") |
| **Course Title** | Left/right-aligned section title in main content | Large centered heading below exam reminder |
| **Lesson Cards** | Cards in 3-col grid, text left + progress circle right | Cards in 3-col grid, text RIGHT + progress circle LEFT (RTL layout), with blue border accent on top, percentage text inside/below circle |
| **Footer Actions** | 2 centered buttons (stats + continue) | 3 equally-spaced large pill buttons with icons: "סטטיסטיקה וביצועים", "בחינה הקרובה", "מעבר לבגרות" |
| **Page Background** | Light gray-blue (`bg-card/50` strip + container) | Gradient from light to slightly darker at bottom |
| **Card Borders** | Transparent border with hover primary/20 | Visible blue/primary border accent (top or full border), subtle background |
| **Section Divider** | No explicit divider between cards and footer | Horizontal rule divider above footer actions |
| **Progress Circle** | Small (56px), percentage not shown when 0% | Larger circle with percentage always visible, colored ring based on progress |

---

## Steps

### Step 1: Update ExamReminderBubble to Centered Badge Style
**~10 minutes**

**Files to touch:**
- `src/app/(frontend)/courses/[courseSlug]/_components/ExamReminderBubble/index.tsx` (MODIFIED)

**Exact behavior:**
- Replace chat-bubble + avatar layout with a centered pill/badge
- Use `bg-primary text-primary-foreground` styling for the badge
- Center horizontally in its container
- Remove the Sparkles icon avatar circle on the right
- Keep the same props interface and translation usage

**Current (lines 14-23):**
```tsx
<div className="flex items-center justify-end gap-3 mt-3 animate-in fade-in">
  <div className="bg-card shadow-card border border-primary/10 rounded-2xl rounded-tr-none px-4 py-2 ...">
  <div className="w-8 h-8 bg-primary rounded-full ...">
```

**New design:**
```tsx
<div className="flex justify-center mt-4 animate-in fade-in">
  <span className="bg-primary text-primary-foreground text-sm font-bold px-6 py-2 rounded-full">
    {message}
  </span>
</div>
```

**Tests that verify:**
- Visual check: Badge appears centered with primary bg color
- Existing functionality: `daysUntil` prop still correctly interpolated

**Acceptance criteria:**
- ✅ Exam reminder renders as centered red/primary pill badge
- ✅ Text still uses translated message with days count
- ✅ No TypeScript errors

---

### Step 2: Update CoursePageContent Layout (Title + Grade Section)
**~15 minutes**

**Files to touch:**
- `src/app/(frontend)/courses/[courseSlug]/_components/CoursePageContent/index.tsx` (MODIFIED)

**Exact behavior:**
- Move course title to a large centered heading below the exam reminder (instead of inside the main content section)
- Change the grade/courseLabel display from a separate section title to be part of the centered title area
- Update the grade+exam section: remove `bg-card/50` strip, use clean centered layout
- Remove the `sectionTitle` logic that changes title per tab — in the design, the course title is always shown as the main heading
- The tab-specific title can still be shown as a smaller subheading if needed

**Current structure (lines 47-64):**
```tsx
{/* Grade strip */}
<div className="w-full bg-card/50 py-4 border-b border-border">
  ...grade label...
  ...exam reminder...
</div>
{/* Main content with section title */}
<main className="container mx-auto px-6 py-10 max-w-5xl">
  <section className="mb-8 text-right px-2">
    <h2 className="text-2xl md:text-3xl font-black">{sectionTitle}</h2>
  </section>
```

**New design structure:**
```tsx
{/* Centered title area - no background strip */}
<div className="w-full py-6 px-6">
  <div className="max-w-5xl mx-auto text-center">
    {hasUpcomingExam && <ExamReminderBubble ... />}
    <h1 className="text-3xl md:text-4xl font-black text-foreground mt-4">
      {course.title}
    </h1>
  </div>
</div>
{/* Main content */}
<main className="container mx-auto px-6 py-6 max-w-5xl">
```

**Tests that verify:**
- Visual check: Title centered, exam reminder above title as pill badge
- All four tabs still render correctly
- Tab switching still works

**Acceptance criteria:**
- ✅ Course title displayed as large centered heading
- ✅ Exam reminder badge appears above title when applicable
- ✅ No section title changes per tab (or shown as subtle subtitle)
- ✅ Tab switching and content rendering unaffected

---

### Step 3: Update CourseTabs Styling
**~10 minutes**

**Files to touch:**
- `src/app/(frontend)/courses/[courseSlug]/_components/CourseTabs/index.tsx` (MODIFIED)

**Exact behavior:**
- Update tab container: remove `border-b border-border` background strip
- Make tabs wider with more spacing between them
- Active tab: outlined/bordered pill style with primary text, no filled background
- Inactive tabs: plain text, similar to current but more spacious
- The design shows tabs as individual rounded pills in a row, with the active one having a visible border

**Current (lines 19-41):**
```tsx
<div className="bg-background pb-3 pt-2 border-b border-border">
  <div className="max-w-2xl mx-auto px-4">
    <div className="bg-muted p-1 rounded-xl flex items-center justify-between">
      <button className="flex-1 py-1.5 text-xs md:text-sm rounded-lg ...">
```

**New design:**
```tsx
<div className="py-4">
  <div className="max-w-lg mx-auto px-4 flex items-center justify-center gap-2">
    {TABS.map((tab) => (
      <button
        className={cn(
          'px-6 py-2 text-sm rounded-full transition-all border',
          isActive
            ? 'border-border bg-card text-primary font-bold shadow-sm'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
```

**Tests that verify:**
- Visual: Tabs appear as separated pills, active has border/shadow
- Tab clicking still switches tabs correctly
- Responsive: tabs still look good on mobile

**Acceptance criteria:**
- ✅ Tabs styled as individual rounded pills
- ✅ Active tab has visible border, shadow, and primary text
- ✅ Tab switching functionality preserved
- ✅ Responsive on mobile (text sizing adjusts)

---

### Step 4: Redesign CourseLessonCard
**~20 minutes**

**Files to touch:**
- `src/app/(frontend)/courses/[courseSlug]/_components/CourseLessonCard/index.tsx` (MODIFIED)

**Exact behavior:**
- Add a visible border accent (blue/primary colored top or full border) on cards
- In the design: cards show text on the right side, progress circle on the left (RTL layout already handles this with `justify-between`)
- Show percentage text always (including 0%) inside/below the progress circle
- Make progress circle slightly larger
- Update card padding and border radius to match design
- The "שיעור X" label and lesson title remain, with "עדיין לא התחלת" status text below
- Add a subtle loading/clock icon next to the "not started" text (visible in design)

**Current (lines 37-63):**
- Card: `bg-card rounded-3xl p-6 shadow-card` with transparent border
- Text left, progress circle right
- No percentage shown at 0%

**New design:**
- Card: `bg-card rounded-2xl p-5 shadow-sm` with visible `border border-primary/30` (or blue accent)
- Always show percentage in the circle
- Pass `percentage` as always-visible text via ProgressCircle children or adjust the component

**Tests that verify:**
- Visual: Cards show blue-tinted border, percentage always visible
- Links still navigate to correct lesson URLs
- Progress circle renders correctly at 0%, 45%, 100%

**Acceptance criteria:**
- ✅ Lesson cards have visible primary/blue border accent
- ✅ Percentage always shown in progress circle (even 0%)
- ✅ Card layout matches design (text side + circle side)
- ✅ Navigation links preserved
- ✅ RTL layout works correctly

---

### Step 5: Update ProgressCircle to Always Show Percentage
**~10 minutes**

**Files to touch:**
- `src/ui/web/shared/ProgressCircle/index.tsx` (MODIFIED — minor)
- `src/app/(frontend)/courses/[courseSlug]/_components/CourseLessonCard/index.tsx` (MODIFIED — usage)

**Exact behavior:**
- The ProgressCircle component already supports showing percentage via its default children rendering, but only when `percentage > 0`
- In the design, "0%" is clearly visible in the empty circles
- Option A: Pass custom children to ProgressCircle from CourseLessonCard to always show percentage
- Option B: Update ProgressCircle default behavior to always show percentage text
- Prefer Option A to avoid breaking other usages

**In CourseLessonCard, update the ProgressCircle usage:**
```tsx
<ProgressCircle percentage={progress} size={56} strokeWidth={3}>
  <text x="50%" y="50%" textAnchor="middle" dy=".3em"
    className="text-sm font-bold fill-foreground">
    {Math.round(progress)}%
  </text>
</ProgressCircle>
```
Remove the conditional Play icon overlay for 0% progress.

**Tests that verify:**
- ProgressCircle renders "0%" text at zero progress
- ProgressCircle renders "45%" and "100%" correctly
- Other ProgressCircle consumers not affected

**Acceptance criteria:**
- ✅ "0%" shows inside circle when progress is zero
- ✅ Play icon removed from CourseLessonCard (or kept conditional)
- ✅ No regression in ProgressCircle elsewhere

---

### Step 6: Redesign Footer Action Buttons
**~20 minutes**

**Files to touch:**
- `src/app/(frontend)/courses/[courseSlug]/_components/CoursePageContent/index.tsx` (MODIFIED)
- `src/i18n/he.json` (MODIFIED — add new translation keys)
- `src/i18n/en.json` (MODIFIED — add new translation keys)

**Exact behavior:**
The design shows 3 large pill buttons in a row below a horizontal divider:
1. **"סטטיסטיקה וביצועים"** (Statistics & Performance) — outline style with chart icon
2. **"בחינה הקרובה"** (Upcoming Exam) — primary/filled style (dark red bg) with shield/exam icon
3. **"מעבר לבגרות"** (Bagrut Transition) — outline style with sparkles icon

Currently there are only 2 buttons. Add a third and restyle all three.

**Changes:**
- Keep the horizontal divider (`border-t`) above buttons
- Change from `flex-wrap` to a responsive 3-column grid or flex row
- Button 1 (Stats): outline/ghost style, rounded-full, with bar chart icon
- Button 2 (Exam): primary filled, rounded-full, with shield/calendar icon
- Button 3 (Bagrut): outline/ghost style, rounded-full, with sparkles icon
- All buttons same height, equal width distribution

**New translations needed:**
```json
"upcomingExam": "בחינה הקרובה",
"bagrutTransition": "מעבר לבגרות",
"statsAndPerformance": "סטטיסטיקה וביצועים"
```

**Tests that verify:**
- Visual: 3 buttons in a row, middle one filled/primary
- Buttons render with correct icons
- Responsive: stack vertically on mobile

**Acceptance criteria:**
- ✅ Three footer action buttons matching design layout
- ✅ Middle button (exam) uses primary fill color
- ✅ Side buttons use outline/ghost style
- ✅ Icons displayed next to text
- ✅ Translation keys added for both locales
- ✅ Responsive stacking on mobile

---

### Step 7: Update Page Background Gradient
**~10 minutes**

**Files to touch:**
- `src/app/(frontend)/courses/[courseSlug]/_components/CoursePageContent/index.tsx` (MODIFIED)

**Exact behavior:**
The design shows a subtle gradient background — lighter at the top, slightly darker/cooler gray at the bottom. The current implementation uses flat `bg-card/50` for the grade strip.

- Wrap the entire CoursePageContent in a container with a subtle gradient background
- Use Tailwind's `bg-gradient-to-b from-background to-muted/50` or similar
- This is cosmetic — just adds visual depth

**Tests that verify:**
- Visual: Page has subtle top-to-bottom gradient
- No impact on text readability or card contrast

**Acceptance criteria:**
- ✅ Page background has subtle gradient
- ✅ Content remains readable
- ✅ Cards maintain visual separation from background

---

### Step 8: Final Polish and Responsive Validation
**~15 minutes**

**Files to touch:**
- All modified files from Steps 1-7 (REVIEW/ADJUST)

**Exact behavior:**
- Verify all changes look correct at desktop (1200px+), tablet (768px), and mobile (375px) widths
- Ensure RTL layout works correctly (text alignment, icon positions, card layout)
- Check tab switching works for all 4 tabs
- Verify AskTab, ExamsTab layouts still use consistent grid patterns
- Run TypeScript check (`pnpm -s tsc --noEmit`)
- Run lint check (`pnpm -s lint`)
- Confirm no console errors

**Tests that verify:**
- `pnpm -s tsc --noEmit` passes
- `pnpm -s lint` passes
- Visual inspection at multiple breakpoints
- All 4 tabs render content correctly

**Acceptance criteria:**
- ✅ No TypeScript errors
- ✅ No lint errors
- ✅ Responsive layout works at all breakpoints
- ✅ RTL support maintained
- ✅ All existing functionality preserved
- ✅ Page visually matches the design reference

---

## Files Summary

| File | Action | Step |
|------|--------|------|
| `src/app/(frontend)/courses/[courseSlug]/_components/ExamReminderBubble/index.tsx` | MODIFIED | 1 |
| `src/app/(frontend)/courses/[courseSlug]/_components/CoursePageContent/index.tsx` | MODIFIED | 2, 6, 7 |
| `src/app/(frontend)/courses/[courseSlug]/_components/CourseTabs/index.tsx` | MODIFIED | 3 |
| `src/app/(frontend)/courses/[courseSlug]/_components/CourseLessonCard/index.tsx` | MODIFIED | 4, 5 |
| `src/ui/web/shared/ProgressCircle/index.tsx` | MODIFIED (minor) | 5 |
| `src/i18n/he.json` | MODIFIED | 6 |
| `src/i18n/en.json` | MODIFIED | 6 |

**Total: 7 files modified, 0 new files**

---

## Assumptions

1. **Design reference is the source of truth** — the Figma site screenshot at `.tasks/260310-auto-355/design-reference-full.png` captures the target design. The design only shows the "Learn" tab view; other tabs (Practice, Ask, Exams) should follow the same card grid pattern they currently use.

2. **Header and Footer are NOT in scope** — the design shows a header and footer, but these are global components shared across all pages. Modifying them would affect the entire application. The spec says "course page redesign", so we focus on the course page content only.

3. **The three footer action buttons are presentational only** — they currently don't have real navigation targets (stats page, bagrut page don't exist). We keep them as buttons that can be wired up later, matching the current behavior.

4. **Progress values are placeholder** — current implementation uses hardcoded `progress = 0`. The design shows 0%, 45%, and 100% values which are mock data. We keep the current data flow.

5. **Icon choices approximate the design** — we use lucide-react icons that closely match the design reference (BarChart3, Shield/GraduationCap, Sparkles). Exact icon matching may require design team confirmation.

6. **No new UI libraries** — per spec constraint, we use existing Tailwind + lucide-react + shadcn/ui only.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Design details may be ambiguous from screenshot | Low | Focus on major structural changes; minor details can be iterated |
| ProgressCircle changes may affect other consumers | Low | Use Option A (pass children) to avoid breaking changes |
| RTL layout may need extra adjustment | Medium | Test with Hebrew locale specifically; use logical properties (`ms-`, `me-`) |
| Translation key additions may conflict with i18n workflow | Low | Add keys to both en.json and he.json simultaneously |
| Footer buttons have no real destinations | Low | Keep as non-navigating buttons (current behavior); wire up in future task |
| Gradient background may not match exactly | Low | Use Tailwind gradient utilities; fine-tune with CSS variables if needed |
