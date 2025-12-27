# Contributing Guide

Thank you for considering contributing to this project! This guide will help you understand our development workflow and standards.

## Development Setup

See [SETUP.md](SETUP.md) for initial setup instructions.

## Workflow

### 1. Create a Branch

```bash
git checkout -b <type>/<description>
```

Branch naming conventions:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Examples:

```bash
git checkout -b feat/user-authentication
git checkout -b fix/header-mobile-layout
git checkout -b docs/api-endpoints
```

### 2. Make Your Changes

Follow these principles:

- Keep changes focused and atomic
- Write clean, self-documenting code
- Add comments only where logic isn't self-evident
- Don't over-engineer - solve the current problem

### 3. Run Quality Gates

Before committing, ensure all checks pass:

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Test
pnpm test
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "type: description"
```

**Commit Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes (dependencies, configs, etc.)
- `revert`: Revert a previous commit

**Examples:**

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve header alignment on mobile"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for auth service"
git commit -m "refactor: simplify user validation logic"
```

**Breaking Changes:**

```bash
git commit -m "feat!: change API response format"
# or
git commit -m "feat: change API response format

BREAKING CHANGE: API now returns data in camelCase instead of snake_case"
```

### 5. Push and Create PR

```bash
git push origin <branch-name>
```

Then create a Pull Request on GitHub.

## PR Guidelines

### PR Title

Use the same format as commit messages:

```
feat: add user authentication
fix: resolve mobile header alignment
```

### PR Description

Include:

1. **What** - What changes were made
2. **Why** - Why these changes are needed
3. **How** - How the changes were implemented
4. **Testing** - How to test the changes

Example:

```markdown
## What

Added user authentication using Payload's built-in auth

## Why

Users need to be able to create accounts and log in to access protected content

## How

- Created Users collection with auth enabled
- Added login/logout API routes
- Implemented protected route middleware
- Added auth UI components

## Testing

1. Start dev server
2. Navigate to /register
3. Create a new account
4. Verify login works
5. Verify protected routes redirect when not authenticated

## Screenshots

[Add screenshots if UI changes]
```

### PR Checklist

Before requesting review, ensure:

- [ ] All quality gates pass (CI checks)
- [ ] Tests added for new features
- [ ] Documentation updated if needed
- [ ] No unrelated changes included
- [ ] Branch is up to date with main

## Code Standards

### TypeScript

```typescript
// ✅ DO: Use strict types
interface User {
  id: string
  name: string
  email: string
}

// ❌ DON'T: Use 'any'
const data: any = {}

// ✅ DO: Use type inference when obvious
const count = 0 // inferred as number

// ✅ DO: Add explicit types when not obvious
const users: User[] = []
```

### React Components

```typescript
// ✅ DO: Use function components
export function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>
}

// ✅ DO: Use TypeScript interfaces for props
interface UserCardProps {
  user: User
  onEdit?: (id: string) => void
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return <div onClick={() => onEdit?.(user.id)}>{user.name}</div>
}
```

### API Routes

```typescript
// ✅ DO: Validate all inputs with Zod
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json()
    const data = schema.parse(body)

    // ✅ DO: Log meaningful events
    logger.info({ requestId, email: data.email }, 'User registration')

    // Your logic here

    return NextResponse.json({ success: true })
  } catch (error) {
    // ✅ DO: Handle validation errors separately
    if (error instanceof z.ZodError) {
      logger.error({ requestId, errors: error.errors }, 'Validation failed')
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 })
    }

    // ✅ DO: Log errors with request correlation
    logger.error({ requestId, error }, 'Server error')
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
```

### Testing

```typescript
// ✅ DO: Write descriptive test names
describe('UserService', () => {
  it('creates user with valid email and password', async () => {
    // Arrange
    const userData = { email: 'test@example.com', password: 'password123' }

    // Act
    const user = await createUser(userData)

    // Assert
    expect(user).toBeDefined()
    expect(user.email).toBe(userData.email)
  })

  it('throws error when email is invalid', async () => {
    const userData = { email: 'invalid-email', password: 'password123' }

    await expect(createUser(userData)).rejects.toThrow('Invalid email')
  })
})
```

### Styling

```typescript
// ✅ DO: Use Tailwind utility classes
<div className="flex items-center justify-between p-4">

// ✅ DO: Use cn() for conditional classes
<div className={cn(
  'rounded-lg border p-4',
  isActive && 'bg-primary text-primary-foreground',
  className
)}>

// ❌ DON'T: Use inline styles (except for dynamic values)
<div style={{ color: 'red' }}> // Bad
<div className="text-red-500"> // Good

// ✅ DO: Use inline styles for truly dynamic values
<div style={{ width: `${percentage}%` }}>
```

## What NOT to Do

### ❌ Don't Skip Quality Gates

```bash
# DON'T
git commit -m "quick fix" --no-verify

# DO
pnpm typecheck && pnpm lint && git commit -m "fix: resolve issue"
```

### ❌ Don't Add Unnecessary Dependencies

Before adding a new package:

1. Check if functionality exists in approved tools
2. Ask for approval if it's a new framework/library
3. Consider implementing simple utilities yourself

### ❌ Don't Over-Engineer

```typescript
// ❌ DON'T: Create abstractions for one-time use
function getUserName(user: User) {
  return user.name
}
const name = getUserName(user)

// ✅ DO: Keep it simple
const name = user.name
```

### ❌ Don't Commit Without Testing

Always test your changes:

```bash
pnpm dev  # Manual testing
pnpm test # Unit tests
pnpm test:e2e # E2E tests (for critical flows)
```

### ❌ Don't Mix Concerns in One PR

**Bad PR:** "Add authentication + fix header + update docs + refactor utils"

**Good PRs:**

- PR 1: "feat: add user authentication"
- PR 2: "fix: header alignment on mobile"
- PR 3: "docs: update API documentation"
- PR 4: "refactor: simplify validation utils"

## Review Process

### For PR Authors

- Respond to feedback promptly
- Don't take feedback personally
- Ask questions if feedback is unclear
- Make requested changes or explain why they shouldn't be made

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Distinguish between "must fix" and "nice to have"
- Approve when quality gates pass and code meets standards

## Getting Help

- Check [README.md](README.md) for general documentation
- Check [SETUP.md](SETUP.md) for setup issues
- Check [project-tooling.md](project-tooling.md) for tooling rules
- Open a discussion for questions
- Open an issue for bugs

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Next.js Docs](https://nextjs.org/docs)
- [Payload CMS Docs](https://payloadcms.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
