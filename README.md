# Ezra Foundations (Phase 1)

Ezra is a production-grade family web app foundation built with Next.js App Router, Supabase, Tailwind, and a minimal Design System.

## Stack

- Next.js 15 + React 19 + TypeScript strict mode
- Tailwind CSS + DS primitives
- Supabase Auth + PostgreSQL + RLS
- Vitest + Testing Library
- Playwright
- Storybook 8
- PWA (`manifest.ts` + service worker via `@ducanh2912/next-pwa`)

## Scripts

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run storybook`
- `npm run format`
- `npm run db:types`

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CHILD_SESSION_SECRET=
EZRA_DEV_AUTH_BYPASS=false
```

Without Supabase vars, the app runs in local dev fallback mode for UI and test flows.
You can also force fallback mode by setting `EZRA_DEV_AUTH_BYPASS=true`.

## Database

- Migration: `supabase/migrations/20260210180000_init_families_profiles.sql`
- Seed: `supabase/seed.sql`

## Docs

- `docs/architecture-overview.md`
- `docs/design-system-basics.md`
