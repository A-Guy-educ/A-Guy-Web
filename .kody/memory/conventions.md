# Conventions

- **TypeScript**: Strict mode, @/ aliases for cross-directory imports (never relative paths)
- **Bilingual**: Update both `messages/en.json` and `messages/he.json` for UI text
- **Payload Workflow**: Run `pnpm generate:types` after schema changes; `pnpm generate:importmap` after adding admin components
- **Design System**: Use CSS variables from `globals.css` and Tailwind tokens from `tailwind.tokens.mjs`; never create custom colors
- **Code Quality**: No `console.log` in production; immutable updates with spread operators; Zod for validation
- **Service Layer**: Place business logic in `src/server/services/`; use idempotency keys for deterministic operations
- **Auth**: OAuth pattern in `src/app/api/oauth/`; validate CSRF state; handle session creation
- **Domains**: No `lib/` folder; organize by feature domain (media/embed, exercise-conversion, etc.)
