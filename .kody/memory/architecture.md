# Architecture

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript strict mode
- **CMS & Backend**: Payload CMS 3.73 (admin panel at `/admin`)
- **Database**: MongoDB Atlas with Vector Search (long-term memory)
- **Styling**: Tailwind CSS + shadcn/ui with centralized design tokens
- **AI**: Google Gemini + OpenAI API integration
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Deployment**: Vercel with sitemap generation

## Project Structure

Domain-first organization under `src/`:

- `app/` — Next.js routes (frontend, API, Payload admin)
- `server/` — Backend services, Payload collections/hooks
- `ui/` — React components (admin, frontend, cody)
- `infra/` — Cross-cutting infrastructure (auth, media, AI, config)
- `client/` — Client hooks and state
- `i18n/` — Internationalization (bilingual support)
- `types/` — Type declarations

## Data Flow

Payload generates TypeScript types → use in components/services → Next.js renders frontend and admin. MongoDB stores documents; Vector Search indexes for AI-powered chat memory. Payload Local API handles backend operations; OAuth middleware secures auth flows.
