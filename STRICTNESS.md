# Repository Strictness Guide

This repository enforces **professional-grade code quality** through automated guardrails. All checks run automatically before commits and in CI/CD.

## Quick Reference

**Before every commit, ensure:**

```bash
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint validation
pnpm test         # Run all tests
```

---

## 1. Git Hooks (Husky)

### Pre-Commit Hook

Runs automatically when you `git commit`. **Cannot be bypassed** (unless using `--no-verify`).

**What it does:**

- ✅ Auto-fixes ESLint errors
- ✅ Auto-formats code with Prettier
- ✅ Type checks TypeScript (`tsc --noEmit`)

**Files affected:**

- `.ts`, `.tsx`, `.js`, `.jsx` - ESLint + Prettier + TypeScript
- `.json`, `.md`, `.yml`, `.yaml`, `.css` - Prettier only

### Commit Message Hook

Enforces **Conventional Commits** format.

**Required format:**

```
<type>: <short description>

<body with minimum 20 characters explaining WHY>
```

**Valid types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (whitespace, formatting)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Maintenance tasks
- `revert` - Revert previous commit

**Examples:**

```bash
# ❌ BAD - Will be rejected
git commit -m "fixed stuff"
git commit -m "update"
git commit -m "fix: short"  # Body too short

# ✅ GOOD
git commit -m "fix: resolve null check in exercise renderer

Fixed a bug where answerSpec could be null when rendering exercises.
Added proper null check before accessing properties to prevent crashes."

git commit -m "feat: add matching exercise type

Implemented new matching exercise type that allows students to match pairs.
Includes admin editor, renderer, and validation logic."
```

---

## 2. TypeScript Strict Mode

**Enabled:** `"strict": true` in `tsconfig.json`

### What this means:

**No implicit `any`:**

```typescript
// ❌ BAD
function process(data) {
  // Error: implicit any
  return data.value
}

// ✅ GOOD
function process(data: { value: string }) {
  return data.value
}
```

**Null/undefined checks:**

```typescript
// ❌ BAD
function render(spec: AnswerSpec | null) {
  return spec.questionType // Error: spec might be null
}

// ✅ GOOD
function render(spec: AnswerSpec | null) {
  if (!spec) return null
  return spec.questionType
}
```

**No unused variables:**

```typescript
// ❌ BAD
function calculate(x: number, y: number) {
  return x * 2 // Error: 'y' is unused
}

// ✅ GOOD - prefix with underscore if intentionally unused
function calculate(x: number, _y: number) {
  return x * 2
}
```

---

## 3. ESLint Rules

**Configuration:** `eslint.config.mjs`

### Key rules:

- ⚠️ **No explicit `any`** - Use proper types
- ⚠️ **No unused variables** - Remove or prefix with `_`
- ⚠️ **No unused arguments** - Prefix with `_` if needed
- ✅ **Next.js best practices** - React hooks, import rules

### Auto-fix:

```bash
pnpm lint:fix  # Automatically fixes fixable issues
```

---

## 3.5. File Organization & Length

### Maximum File Length

**Rule:** No file should exceed **150 lines**

**Why:** Large files are hard to understand, test, and maintain. Break them into smaller, focused modules.

**How to split files:**

```typescript
// ❌ BAD - 300 line SignupForm.tsx
'use client'
export function SignupForm() {
  // ... 300 lines of logic + styling + validation ...
}

// ✅ GOOD - Split into multiple files
// SignupForm.tsx (50 lines) - Main component
// SignupFormFields.tsx (40 lines) - Form field components
// signupValidation.ts (30 lines) - Validation logic
// signupStyles.ts (20 lines) - Styled components or CSS-in-JS
```

### Separation of Concerns

**Rule:** Separate styling from logic - NO mixing in the same file

**File extensions for different concerns:**

- `.tsx` / `.jsx` - React components (UI structure ONLY, no business logic)
- `.ts` / `.js` - Business logic (actions, utils, handlers, validation)
- `.css` / `.module.css` - **STYLING FILES** (separate from components and logic)
- `_styles.ts` - Styled components (if using CSS-in-JS instead of CSS)

**CRITICAL: Components (.tsx), Logic (.ts), and Styling (.css) are ALWAYS separate files**

**This project uses Tailwind CSS:**

- Styling is done with Tailwind utility classes directly in `.tsx` files
- If we were NOT using Tailwind, styles would be in separate `.css` / `.module.css` files
- `.tsx` files contain component structure + Tailwind classes (NOT business logic)
- `.ts` files contain ALL business logic (actions, validation, handlers)

```typescript
// ❌ BAD - Logic mixed with UI in .tsx
// SignupForm.tsx
export function SignupForm() {
  async function validateEmail(email: string) {
    // 50 lines of validation logic...
  }

  async function submitToDatabase(data: FormData) {
    // 80 lines of database logic...
  }

  return <form>...</form>
}

// ✅ GOOD - Separation of concerns
// SignupForm.tsx - ONLY UI and composition
import { validateSignupForm } from './signup_validation'
import { signupAction } from './signup_actions'

export function SignupForm() {
  async function onSubmit(e) {
    const errors = validateSignupForm(formData)
    if (errors) return
    await signupAction(formData)
  }

  return <form onSubmit={onSubmit}>...</form>
}

// signup_validation.ts - Validation logic
export function validateSignupForm(data: FormData) {
  // Validation logic here
}

// signup_actions.ts - Server actions
'use server'
export async function signupAction(data: FormData) {
  // Database logic here
}
```

**Styling approaches:**

1. **Tailwind classes** (preferred) - Keep in component .tsx files
2. **CSS modules** - Separate `ComponentName.module.css` file
3. **Styled components** - Separate `ComponentName_styles.ts` file

**File type usage:**

- **`.tsx`** = React components (UI only, can include Tailwind)
- **`.ts`** = All non-UI logic (actions, utils, handlers, validation)
- **`.module.css`** = Styles (when not using Tailwind)

**When a file exceeds 150 lines:**

1. Identify distinct responsibilities (logic, validation, types, sub-components)
2. Extract each into its own file
3. Use clear, descriptive file names
4. Keep related files in the same directory

---

## 4. Prettier Formatting

**Configuration:** `.prettierrc.json`

### Rules (auto-applied):

```typescript
// Single quotes
const text = 'hello' // ✅
const text = 'hello' // ❌

// No semicolons
const x = 5 // ✅
const x = 5 // ❌

// Trailing commas
const arr = [1, 2, 3] // ✅

// Max line width: 100 characters
```

**All formatting is automatic** - Husky applies it before commits.

---

## 5. CI/CD Pipeline

**Runs on:** Every push to `main` and every pull request

### Quality Gates Job

```bash
1. pnpm typecheck          # TypeScript validation
2. pnpm lint               # ESLint validation
3. prettier --check        # Format validation
```

### Tests Job

```bash
4. pnpm test:int           # Unit/integration tests
5. pnpm test:e2e           # End-to-end tests (Playwright)
```

### Build Job

```bash
6. pnpm build              # Production build
```

**All 6 steps must pass or PR is blocked!**

---

## Development Workflow

### Starting a new feature:

1. **Create a branch:**

   ```bash
   git checkout -b feat/matching-exercises
   ```

2. **Make changes** (code will auto-format on save if using VSCode)

3. **Run checks locally:**

   ```bash
   pnpm typecheck  # Must pass
   pnpm lint       # Must pass
   pnpm test       # Must pass
   ```

4. **Commit with proper message:**

   ```bash
   git add .
   git commit  # Hooks will auto-fix formatting
   ```

   Write message:

   ```
   feat: add matching exercise type

   Implemented new matching exercise type with drag-and-drop interface.
   Students can now match items between two columns for quiz questions.
   ```

5. **Push and create PR:**

   ```bash
   git push -u origin feat/matching-exercises
   ```

6. **Wait for CI** - All checks must pass before merging

---

## Bypass Hooks (Emergency Only)

**Not recommended!** Only use if absolutely necessary:

```bash
git commit --no-verify -m "emergency fix"
```

**Warning:** CI will still catch issues, so you'll need to fix them anyway!

---

## Common Issues & Solutions

### Issue: "Implicit any" error

**Solution:** Add type annotations

```typescript
// Before
function process(data) {}

// After
function process(data: ExerciseData) {}
```

### Issue: "Unused variable" warning

**Solution:** Remove it or prefix with `_`

```typescript
// If truly unused
function handler(_event: Event) {}
```

### Issue: Commit message rejected

**Solution:** Use conventional format with detailed body

```bash
git commit -m "feat: add feature

This adds the feature because users need it.
The implementation uses X approach for Y reason."
```

### Issue: Prettier formatting conflicts

**Solution:** Let Prettier win - it runs automatically

```bash
# Manual fix if needed
pnpm exec prettier --write .
```

---

## Required Tools

Make sure you have:

- **Node.js** 18.20.2+ or 20.9.0+
- **pnpm** 9 or 10
- **Docker** (for MongoDB)

Check versions:

```bash
node --version   # Should be 18.20.2+ or 20.9.0+
pnpm --version   # Should be 9.x or 10.x
docker --version # Any recent version
```

---

## Summary

This repo enforces quality through:

1. ✅ **Husky hooks** - Auto-fix and validate before commits
2. ✅ **TypeScript strict** - Catch type errors at compile time
3. ✅ **ESLint** - Enforce code quality rules
4. ✅ **Prettier** - Consistent code formatting
5. ✅ **CI/CD** - Automated testing and validation
6. ✅ **Conventional Commits** - Clear, structured commit history

**Bottom line:** If it commits and pushes, it's production-ready code.
