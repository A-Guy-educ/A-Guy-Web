# Payload + Next.js Starter Template

A production-ready starter template combining Payload CMS with Next.js, featuring comprehensive tooling for quality, testing, and observability.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript (strict mode) + TailwindCSS
- **Backend**: Payload CMS (integrated with Next.js)
- **Database**: MongoDB
- **Package Manager**: pnpm

## Features

### Quality Gates

- ✅ Husky + lint-staged (pre-commit hooks)
- ✅ commitlint (Conventional Commits)
- ✅ ESLint + Prettier
- ✅ TypeScript strict mode
- ✅ GitHub Actions CI/CD

### UI Components

- ✅ shadcn/ui (component library)
- ✅ Radix UI Primitives
- ✅ lucide-react (icons)
- ✅ next-themes (theme switching)
- ✅ Sonner (toast notifications)
- ✅ cmdk (command palette)

### Testing

- ✅ Vitest (unit/integration tests)
- ✅ React Testing Library
- ✅ Playwright (E2E tests)
- ✅ Testcontainers (MongoDB integration tests)

### Observability

- ✅ Pino (structured logging with request correlation)
- ✅ Sentry (error tracking)

### Validation

- ✅ Zod (schema validation at API boundaries)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local MongoDB)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd <project-name>
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and configure:

- `DATABASE_URI`: MongoDB connection string
- `PAYLOAD_SECRET`: Secret key for Payload (use a strong random string)
- `SENTRY_DSN`: (Optional) Sentry DSN for error tracking

4. Start MongoDB:

```bash
docker-compose up -d
```

5. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

### Access Points

- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **API**: http://localhost:3000/api

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:e2e` - Run E2E tests with Playwright
- `pnpm payload` - Access Payload CLI

## Project Structure

```
.
├── .github/
│   └── workflows/        # GitHub Actions CI workflows
├── .husky/               # Git hooks configuration
├── e2e/                  # Playwright E2E tests
├── public/               # Static assets
├── src/
│   ├── __tests__/        # Unit tests
│   ├── app/              # Next.js App Router
│   │   ├── (payload)/    # Payload admin & API routes
│   │   ├── api/          # Custom API routes
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Homepage
│   ├── components/
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utility functions & logger
│   └── payload/
│       ├── collections/  # Payload collections
│       └── payload.config.ts
├── .env.example          # Environment variables template
├── docker-compose.yml    # MongoDB Docker setup
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Development Workflow

### Creating a Feature

1. Create a new branch:

```bash
git checkout -b feat/your-feature
```

2. Make your changes

3. Run quality gates:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

4. Commit using conventional commits:

```bash
git commit -m "feat: add new feature"
```

Commit types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Adding a New Payload Collection

1. Create a new file in `src/payload/collections/`:

```typescript
// src/payload/collections/YourCollection.ts
import type { CollectionConfig } from 'payload'

export const YourCollection: CollectionConfig = {
  slug: 'your-collection',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
  ],
}
```

2. Import and add to `src/payload/payload.config.ts`:

```typescript
import { YourCollection } from './collections/YourCollection'

export default buildConfig({
  collections: [Users, Posts, YourCollection],
  // ...
})
```

### Adding API Routes with Validation

Use Zod for validation at all API boundaries:

```typescript
// src/app/api/your-route/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'

const schema = z.object({
  field: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    logger.info({ requestId }, 'Processing request')

    const body = await req.json()
    const data = schema.parse(body)

    // Your logic here

    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ requestId, errors: error.errors }, 'Validation error')
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 })
    }

    logger.error({ requestId, error }, 'Internal error')
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
```

## Testing

### Unit Tests

Run all unit tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test -- --watch
```

Example test:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Tests

Run E2E tests:

```bash
pnpm test:e2e
```

Run E2E tests in UI mode:

```bash
pnpm exec playwright test --ui
```

## Deployment

### Environment Variables

Required for production:

- `DATABASE_URI` - MongoDB connection string
- `PAYLOAD_SECRET` - Secret key for Payload
- `NEXT_PUBLIC_SERVER_URL` - Your production URL
- `SENTRY_DSN` - (Optional) Sentry DSN

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

## Quality Standards

All PRs must pass:

- ✅ TypeScript type checking (`pnpm typecheck`)
- ✅ ESLint (`pnpm lint`)
- ✅ Prettier formatting (`pnpm format:check`)
- ✅ Unit tests (`pnpm test`)
- ✅ E2E tests (`pnpm test:e2e`)
- ✅ Build (`pnpm build`)

## Contributing

1. Follow conventional commits
2. Keep PRs small and focused
3. Add tests for new features
4. Update documentation as needed
5. Ensure all quality gates pass

## License

ISC
