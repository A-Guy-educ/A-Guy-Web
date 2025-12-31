# Claude Code Reference

This file serves as the entry point for Claude Code (AI assistant) when working on this project.

**NOTE:** See [CLAUDE_INTERNAL.md](CLAUDE_INTERNAL.md) for team-specific learnings, patterns, and manager feedback.

## Primary Documentation

When working on this codebase, refer to these documents in order:

### 1. [AGENTS.md](AGENTS.md) - Payload CMS Development Rules

**Read this first for all Payload CMS development.**

Contains:

- Core principles and best practices
- Project structure
- Collection and field patterns
- **CRITICAL security patterns** (access control, transactions, hooks)
- Component development
- Custom endpoints
- Type safety guidelines

### 2. [NAMING.md](NAMING.md) - File Naming & Organization

**Read this BEFORE creating any new files.**

Contains:

- File naming conventions (NO mystery files!)
- Feature prefixing rules
- Type suffix patterns
- Folder organization strategies
- Component vs logic file naming
- Anti-patterns to avoid
- **CRITICAL:** No generic names like `utils.ts`, `actions.ts`, `helpers.ts`

### 3. [STRICTNESS.md](STRICTNESS.md) - Repository Quality Standards

**Read this for understanding code quality requirements.**

Contains:

- Git hooks (Husky) - pre-commit and commit message rules
- TypeScript strict mode requirements
- ESLint rules and auto-fixing
- Prettier formatting standards
- File length limits (150 lines max)
- Separation of concerns (.tsx vs .ts)
- CI/CD pipeline requirements
- Development workflow
- Common issues and solutions

### 4. [setup.md](setup.md) - Initial Setup Guide

**For first-time repository setup.**

Contains:

- Dependency installation
- Environment variable configuration
- MongoDB setup with Docker
- Development server startup
- Verification steps

## Critical Requirements

### Internationalization (i18n)

**ALL user-facing text MUST support both English and Hebrew.**

- Translation files: `messages/en.json` and `messages/he.json`
- Use `useTranslations()` hook in client components
- Never hardcode user-facing text in components
- Add new translation keys to both language files
- Test language switching on all new features

Examples of what needs translation:

- Button labels
- Form fields and placeholders
- Error messages
- Navigation items
- Welcome messages
- Status text (loading states, etc.)

## Quick Command Reference

### Development

```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
```

### Quality Checks (Run before committing!)

```bash
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint validation
pnpm lint:fix         # Auto-fix ESLint issues
pnpm test             # Run all tests
pnpm test:int         # Integration tests only
pnpm test:e2e         # E2E tests only
```

### Payload CMS

```bash
pnpm generate:types      # Generate TypeScript types from schema
pnpm generate:importmap  # Generate import map for components
```

### Database

```bash
docker-compose up -d     # Start MongoDB
docker-compose down      # Stop MongoDB
docker-compose ps        # Check MongoDB status
docker-compose logs      # View MongoDB logs
```

## Project Structure

```
src/
├── app/
│   ├── (frontend)/          # Public-facing Next.js routes
│   └── (payload)/           # Payload CMS admin routes
├── collections/             # Payload collection configs (Exercises, Lessons, etc.)
├── globals/                 # Payload global configs
├── components/              # React components
│   ├── admin/              # Admin panel components
│   │   └── ExerciseEditor/ # Exercise creation UI
│   └── ExerciseRenderer/   # Student-facing exercise UI
├── contracts/              # Zod schemas & TypeScript types
│   ├── exercise/           # Exercise-related schemas
│   └── graphics/           # Graphics specs (Axis, Geometry)
├── blocks/                 # Payload content blocks
├── access/                 # Access control functions
├── hooks/                  # Payload hooks
└── payload.config.ts       # Main Payload configuration
```

## Key Concepts

### Exercise System Architecture

Exercises in this system have **5 synchronized layers**:

1. **Schema** (`src/contracts/exercise/answers.ts`)
   - Zod validation schemas
   - TypeScript type definitions
   - Discriminated unions by `questionType`

2. **Collection** (`src/collections/Exercises.ts`)
   - Database schema
   - Field validation
   - Admin UI configuration

3. **Admin Editor** (`src/components/admin/ExerciseEditor/`)
   - UI for creating exercises in admin panel
   - Specific editors per question type

4. **Frontend Renderer** (`src/components/ExerciseRenderer/`)
   - UI for students to view/answer exercises
   - Specific renderers per question type

5. **Type Generation** (auto-generated)
   - Run `pnpm generate:types` after schema changes

### Current Exercise Types

- **MCQ (Multiple Choice)** - Single or multi-select
- **True/False** - Boolean questions
- **Free Response** - Numeric, algebraic, or text answers

## Adding a New Exercise Type

**Example:** Adding a "matching" exercise type

### Step 1: Define Schema

**File:** `src/contracts/exercise/answers.ts`

```typescript
const MatchingAnswerSpecSchema = z
  .object({
    questionType: z.literal('matching'),
    pairs: z.array(
      z.object({
        left: z.string(),
        right: z.string(),
      }),
    ),
  })
  .strict()

// Add to union
export const AnswerSpecSchema = z.discriminatedUnion('questionType', [
  McqAnswerSpecSchema,
  TrueFalseAnswerSpecSchema,
  FreeResponseAnswerSpecSchema,
  MatchingAnswerSpecSchema, // ← Add here
])
```

### Step 2: Update Collection

**File:** `src/collections/Exercises.ts`

```typescript
{
  name: 'questionType',
  options: [
    { label: 'Multiple Choice (MCQ)', value: 'mcq' },
    { label: 'True/False', value: 'true_false' },
    { label: 'Free Response', value: 'free_response' },
    { label: 'Matching', value: 'matching' },  // ← Add here
  ],
}
```

### Step 3: Create Admin Editor

**File:** `src/components/admin/ExerciseEditor/MatchingAnswerEditor.tsx`

```typescript
'use client'
export function MatchingAnswerEditor({ value, onChange }) {
  // UI for creating matching pairs
}
```

**Update:** `src/components/admin/ExerciseEditor/AnswerSpecJsonEditor.tsx`

```typescript
case 'matching':
  return <MatchingAnswerEditor value={value} onChange={onChange} />
```

### Step 4: Create Frontend Renderer

**File:** `src/components/ExerciseRenderer/answers/MatchingAnswerUI/index.tsx`

```typescript
'use client'
export function MatchingAnswerUI({ answerSpec }) {
  // UI for students to answer
}
```

**Update:** `src/components/ExerciseRenderer/answers/AnswerRenderer/index.tsx`

```typescript
case 'matching':
  return <MatchingAnswerUI answerSpec={answerSpec} />
```

### Step 5: Generate Types

```bash
pnpm generate:types
```

## Important Notes for AI Development

### Security (CRITICAL!)

- Always use `overrideAccess: false` when passing `user` to Local API
- Always pass `req` to nested operations in hooks (for transactions)
- Use context flags to prevent infinite hook loops
- See [AGENTS.md](AGENTS.md) for detailed security patterns

### Type Safety

- Run `pnpm generate:types` after schema changes
- Never use `any` type (strict mode enabled)
- Import types from `@/payload-types` or `@/contracts`

### Code Quality

- All code must pass `pnpm typecheck`, `pnpm lint`, `pnpm test`
- Prettier auto-formats on commit
- Commit messages must follow Conventional Commits format
- See [STRICTNESS.md](STRICTNESS.md) for details

### Components

- Server Components by default (no `'use client'`)
- Use `'use client'` only when needed (state, effects, events)
- Component paths are relative to project root
- Run `pnpm generate:importmap` after creating components
- See [AGENTS.md](AGENTS.md) Components section for details

### Payload CMS Patterns

- Collections = database tables with admin UI
- Fields = columns with validation
- Hooks = lifecycle events (beforeChange, afterChange, etc.)
- Access control = permissions (collection and field level)
- See [AGENTS.md](AGENTS.md) for comprehensive patterns

## Troubleshooting

### Type errors

```bash
pnpm generate:types  # Regenerate types
pnpm typecheck       # Check for errors
```

### Linting errors

```bash
pnpm lint:fix        # Auto-fix
pnpm lint            # Check remaining issues
```

### Import map issues

```bash
pnpm generate:importmap  # Regenerate component imports
```

### MongoDB connection issues

```bash
docker-compose down
docker-compose up -d
docker-compose ps    # Verify running
```

### Commit rejected

- Check commit message format (see [STRICTNESS.md](STRICTNESS.md))
- Ensure body has 20+ characters
- Use conventional commit type (feat, fix, etc.)

## Environment Files

- `.env` - Local environment variables (in `.gitignore`)
- `.env.example` - Template for required variables

**Required variables:**

```env
DATABASE_URL=mongodb://localhost:27017/payload-starter
PAYLOAD_SECRET=<generated-secret>
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## Testing

### Test Structure

- **Unit/Integration tests:** `tests/*.test.ts` (Vitest)
- **E2E tests:** `tests/e2e/*.e2e.spec.ts` (Playwright)

### Running Tests

```bash
pnpm test           # All tests
pnpm test:int       # Vitest only
pnpm test:e2e       # Playwright only
```

## CI/CD

GitHub Actions runs on every push to `main` and all PRs:

1. TypeScript type checking
2. ESLint validation
3. Prettier format checking
4. Unit/integration tests
5. E2E tests
6. Production build

**All must pass before merge!**

## Additional Resources

- **Payload CMS Docs:** https://payloadcms.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Zod Docs:** https://zod.dev

---

**For detailed information, always refer to [AGENTS.md](AGENTS.md) and [STRICTNESS.md](STRICTNESS.md) first.**
