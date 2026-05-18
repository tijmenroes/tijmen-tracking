# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Type-check + production build
npm run preview      # Preview production build (http://localhost:4173)

npm run test:unit    # Run Vitest unit tests
npm run test:e2e     # Run Playwright e2e tests
npm run lint         # Run oxlint + eslint with auto-fix
npm run format       # Format with Prettier
npm run type-check   # Run vue-tsc type validation
```

Run a single unit test file:
```bash
npx vitest run src/__tests__/SomeComponent.spec.ts
```

Run a single e2e test file:
```bash
npx playwright test e2e/some.spec.ts
```

## Architecture

**Stack:** Vue 3 + TypeScript + Vite, Pinia for state, Vue Router for navigation, Supabase for backend, Capacitor for native mobile/desktop packaging.

**Authentication & data access:** All data access requires login. Supabase Auth handles authentication. Row Level Security (RLS) is enforced at the database level — every user can only access their own rows. Always design queries and stores with this in mind; never try to work around RLS.

**State management:** Pinia stores live in `src/stores/`. Each domain (e.g. workouts, exercises) gets its own store. Stores interact with Supabase directly and expose reactive state to components.

**Routing:** `src/router/index.ts`. Protected routes should guard against unauthenticated access by checking Supabase session state.

**Environment variables:** Two Supabase variables must be present in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Mobile/desktop publishing:** Capacitor is used to wrap the app for iOS and desktop. Capacitor is not yet initialized — when setting it up, use `npx cap init` and follow the Capacitor docs for iOS.

## Development approach

- **Phase 1 — no styling.** Build features functionally first. Do not add CSS, utility classes, or component libraries until styling phase begins.
- **Tests are required for new features.** Write Vitest unit tests alongside new stores and components. Use Playwright for user-flow e2e tests.
- **Linting:** The project uses both oxlint (fast, correctness rules) and eslint (Vue/TS rules). Run `npm run lint` before committing.
- **Path alias:** Use `@/` to import from `src/` (e.g. `import { useAuthStore } from '@/stores/auth'`).
