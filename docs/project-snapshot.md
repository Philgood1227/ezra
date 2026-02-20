# Project Snapshot

Snapshot date: 2026-02-20  
Repository root: `c:\Users\la\ezra`  
Inspection mode: read-only (no dependency install, no test run, no config change)

## 0) Method and evidence policy
- All findings below are derived from direct file reads and read-only shell commands.
- If something is not present in the repository, it is explicitly marked as `not found`.
- Secrets from `.env.local` are intentionally redacted; only variable names are reported.

## 1) Stack and tooling (evidence-based)

### 1.1 Core stack
| Area | Finding | Evidence |
|---|---|---|
| Framework | Next.js App Router | `src/app` exists with route groups and `page.tsx` files; `src/pages` and `pages` are `not found`; `next` dep in `package.json:27` |
| Rendering model | Mixed server + client components | Server route files in `src/app/(child)/child/page.tsx`; client files with `"use client"` in `src/components/child/child-home-live.tsx:1`, `src/components/child/my-day/child-day-view-live.tsx:1`, `src/components/timeline/day-timeline.tsx:1` |
| Language | TypeScript strict mode | `tsconfig.json:9-24` (`strict`, `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| Package manager | npm | `package-lock.json` present; `pnpm-lock.yaml` and `yarn.lock` not found |
| Styling | Tailwind CSS + CSS variable tokens | `tailwind.config.ts:3-13`, token bindings in `tailwind.config.ts:15-80`, token definitions in `src/app/globals.css:20-100` |
| Motion | Framer Motion | dep in `package.json:26`; used in child/timeline components |
| Data backend | Supabase + local demo fallback | deps in `package.json:22-23`; gating in `src/lib/supabase/env.ts:13-19`; fallback branch in `src/lib/api/day-view.ts:286-352` |
| PWA | `@ducanh2912/next-pwa` + offline route | `next.config.ts:2,7-18`; `src/app/~offline/page.tsx` |
| Validation | Zod | dep in `package.json:31`; used in server actions e.g. `src/lib/actions/tasks.ts`, `src/lib/actions/rewards.ts` |

### 1.2 Scripts and commands (from `package.json`)
Defined in `package.json:5-18`:

- `npm run dev` -> `next dev`
- `npm run build` -> `next build`
- `npm run start` -> `next start`
- `npm run lint` -> `eslint . --max-warnings=0`
- `npm run typecheck` -> `tsc --noEmit`
- `npm run format` -> `prettier --write .`
- `npm run format:check` -> `prettier --check .`
- `npm run test` -> `vitest run`
- `npm run test:watch` -> `vitest`
- `npm run test:e2e` -> `playwright test`
- `npm run storybook` -> Storybook dev
- `npm run storybook:build` -> Storybook build
- `npm run db:types` -> Supabase type generation to `src/types/database.ts`

### 1.3 Config inventory
| File | Status | Key evidence |
|---|---|---|
| `package.json` | found | scripts + deps (`package.json:5-61`) |
| `package-lock.json` | found | npm lockfile |
| `tsconfig.json` | found | strict TS + alias `@/*` (`tsconfig.json:30-33`) |
| `next.config.ts` | found | PWA config + optional `distDir` via `NEXT_DIST_DIR` |
| `tailwind.config.ts` | found | DS token integration and extensions |
| `postcss.config.mjs` | found | Tailwind + Autoprefixer |
| `eslint.config.mjs` | found | Next core-web-vitals + TS + Prettier |
| `.prettierrc.json` | found | Prettier + `prettier-plugin-tailwindcss` |
| `vitest.config.ts` | found | jsdom + setup + include pattern |
| `vitest.setup.ts` | found | Testing Library jest-dom setup |
| `playwright.config.ts` | found | E2E config and webServer |
| `jest.config.*` | not found | not found |
| `cypress.config.*` | not found | not found |
| `.github/workflows` | not found | CI workflows not found |
| `.env.example` | not found | not found |
| `supabase/config.toml` | found | local Supabase project config |

### 1.4 Environment assumptions
- README env doc exists (`README.md:28-39`).
- `.env.local` keys detected (values redacted):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CHILD_SESSION_SECRET`
  - `EZRA_DEV_AUTH_BYPASS`
  - `DAY_PLAN_V2`
  - `NEXT_PUBLIC_DAY_PLAN_V2`
- Supabase enable/bypass logic: `src/lib/supabase/env.ts:9-19`.
- Day-plan v2 flag logic: `src/config/feature-flags.ts:10-11`.

## 2) Repository structure map (depth <= 4)

### 2.1 Directory tree output
```text
=== app ===
not found
=== src/app ===
src/app
├── (auth)
│   ├── auth
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── pin
│   │   │   └── page.tsx
│   │   ├── register
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── layout.tsx
│   └── template.tsx
├── (child)
│   ├── child
│   │   ├── achievements
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── checklists
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── cinema
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── emotions
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── focus
│   │   │   └── [instanceId]
│   │   ├── knowledge
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── meals
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── my-day
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── layout.tsx
│   └── template.tsx
├── (parent)
│   ├── parent
│   │   ├── achievements
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── alarms
│   │   │   └── page.tsx
│   │   ├── categories
│   │   │   └── page.tsx
│   │   ├── checklists
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── cinema
│   │   │   └── page.tsx
│   │   ├── dashboard
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── day-templates
│   │   │   ├── [id]
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── gamification
│   │   │   └── page.tsx
│   │   ├── knowledge
│   │   │   ├── [subjectId]
│   │   │   └── page.tsx
│   │   ├── meals
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── notifications
│   │   │   └── page.tsx
│   │   ├── rewards
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── school-diary
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── settings
│   │   │   └── page.tsx
│   │   └── page.tsx
│   └── layout.tsx
├── ~offline
│   └── page.tsx
├── api
│   ├── auth
│   │   ├── child
│   │   │   ├── pin
│   │   │   └── pin-config
│   │   ├── parent
│   │   │   ├── login
│   │   │   ├── logout
│   │   │   └── register
│   │   └── _utils.ts
│   └── parent
│       └── nav-badges
│           └── route.ts
├── error.tsx
├── favicon.ico
├── globals.css
├── layout.tsx
├── loading.tsx
├── manifest.ts
├── not-found.tsx
└── page.tsx
=== pages ===
not found
=== src/pages ===
not found
=== components ===
not found
=== src/components ===
src/components
├── calendar
│   ├── CalendarPanel.stories.tsx
│   ├── CalendarPanel.tsx
│   ├── DateDisplay.tsx
│   ├── MonthStrip.tsx
│   └── SeasonBadge.tsx
├── child
│   ├── achievements
│   │   ├── achievement-badge.stories.tsx
│   │   ├── achievement-badge.tsx
│   │   ├── achievement-unlock-celebration.stories.tsx
│   │   ├── achievement-unlock-celebration.tsx
│   │   ├── child-achievements-view.tsx
│   │   └── index.ts
│   ├── checklists
│   │   ├── checklist-card.stories.tsx
│   │   ├── checklist-card.tsx
│   │   ├── checklist-item-row.stories.tsx
│   │   ├── checklist-item-row.tsx
│   │   ├── child-checklists-view.tsx
│   │   └── index.ts
│   ├── cinema
│   │   ├── child-cinema-view.tsx
│   │   ├── index.ts
│   │   ├── movie-option-card.stories.tsx
│   │   └── movie-option-card.tsx
│   ├── emotions
│   │   ├── child-emotions-view.tsx
│   │   ├── emotion-check-in-card.tsx
│   │   ├── emotion-picker.stories.tsx
│   │   ├── emotion-picker.tsx
│   │   ├── index.ts
│   │   └── week-emotion-strip.tsx
│   ├── focus
│   │   └── focus-view.tsx
│   ├── home
│   │   ├── child-home-icons.tsx
│   │   ├── child-home-now-card.tsx
│   │   ├── index.ts
│   │   ├── today-header.tsx
│   │   └── tools-and-knowledge-card.tsx
│   ├── icons
│   │   └── child-premium-icons.tsx
│   ├── knowledge
│   │   ├── child-knowledge-view.tsx
│   │   ├── index.ts
│   │   ├── knowledge-card-detail.tsx
│   │   ├── knowledge-card-tile.stories.tsx
│   │   ├── knowledge-card-tile.tsx
│   │   ├── subject-card.stories.tsx
│   │   └── subject-card.tsx
│   ├── meals
│   │   ├── child-meals-view.tsx
│   │   ├── favorite-meals-list.tsx
│   │   ├── index.ts
│   │   ├── meal-card.stories.tsx
│   │   └── meal-card.tsx
│   ├── my-day
│   │   └── child-day-view-live.tsx
│   └── child-home-live.tsx
├── ds
│   ├── avatar.stories.tsx
│   ├── avatar.tsx
│   ├── badge.stories.tsx
│   ├── badge.tsx
│   ├── button.stories.tsx
│   ├── button.tsx
│   ├── card.stories.tsx
│   ├── card.tsx
│   ├── empty-state.stories.tsx
│   ├── empty-state.tsx
│   ├── index.ts
│   ├── input.stories.tsx
│   ├── input.tsx
│   ├── modal.stories.tsx
│   ├── modal.tsx
│   ├── page-layout.stories.tsx
│   ├── page-layout.tsx
│   ├── progress-bar.stories.tsx
│   ├── progress-bar.tsx
│   ├── select.stories.tsx
│   ├── select.tsx
│   ├── skeleton.stories.tsx
│   ├── skeleton.tsx
│   ├── tab-bar.stories.tsx
│   ├── tab-bar.tsx
│   ├── textarea.stories.tsx
│   ├── textarea.tsx
│   ├── theme-provider.tsx
│   ├── theme-script.tsx
│   ├── theme-toggle.stories.tsx
│   ├── theme-toggle.tsx
│   ├── toast.stories.tsx
│   └── toast.tsx
├── feedback
│   ├── child-feedback-banner.tsx
│   ├── network-status-banner.tsx
│   └── parent-feedback-banner.tsx
├── knowledge
├── layout
│   ├── auth-shell.tsx
│   ├── child-shell.tsx
│   ├── child-theme-lock.tsx
│   ├── more-menu.tsx
│   ├── parent-header.tsx
│   ├── parent-shell.tsx
│   ├── parent-sidebar.tsx
│   └── placeholder-page.tsx
├── motion
│   ├── fade-in.tsx
│   ├── index.ts
│   ├── list-stagger.stories.tsx
│   ├── list-stagger.tsx
│   ├── page-transition.stories.tsx
│   ├── page-transition.tsx
│   └── scale-on-tap.tsx
├── notifications
│   ├── index.ts
│   ├── NotificationBanner.tsx
│   └── NotificationCenter.tsx
├── onboarding
│   ├── child-onboarding-overlay.tsx
│   └── parent-onboarding-modal.tsx
├── parent
│   └── dashboard
│       ├── dashboard-date.ts
│       ├── emotions-widget.stories.tsx
│       ├── emotions-widget.tsx
│       ├── index.ts
│       ├── kpi-card.stories.tsx
│       ├── kpi-card.tsx
│       ├── meals-widget.stories.tsx
│       ├── meals-widget.tsx
│       ├── parent-dashboard-skeleton.tsx
│       ├── school-diary-widget.stories.tsx
│       ├── school-diary-widget.tsx
│       ├── today-load-widget.stories.tsx
│       ├── today-load-widget.tsx
│       ├── weekly-points-widget.stories.tsx
│       ├── weekly-points-widget.tsx
│       ├── weekly-tasks-widget.stories.tsx
│       └── weekly-tasks-widget.tsx
├── preferences
│   └── feedback-preferences-card.tsx
├── time
│   ├── AnalogClock.stories.tsx
│   ├── AnalogClock.tsx
│   ├── ClockPanel.stories.tsx
│   ├── ClockPanel.tsx
│   ├── DigitalClock.stories.tsx
│   └── DigitalClock.tsx
├── timeline
│   ├── category-visuals.ts
│   ├── daily-progress-bar.tsx
│   ├── day-timeline.stories.tsx
│   ├── day-timeline.tsx
│   ├── index.ts
│   ├── next-up-banner.stories.tsx
│   ├── next-up-banner.tsx
│   ├── now-cursor.tsx
│   ├── points-fly-up.tsx
│   ├── time-axis.tsx
│   └── timeline-task-card.tsx
└── timers
    ├── circular-timer.stories.tsx
    ├── circular-timer.tsx
    ├── index.ts
    ├── pomodoro-view.stories.tsx
    └── pomodoro-view.tsx
=== lib ===
not found
=== src/lib ===
src/lib
├── actions
│   ├── achievements.ts
│   ├── alarms.ts
│   ├── checklists.ts
│   ├── cinema.ts
│   ├── day-templates.ts
│   ├── emotions.ts
│   ├── ensure-today-instances.ts
│   ├── knowledge.ts
│   ├── meals.ts
│   ├── notifications.ts
│   ├── rewards.ts
│   ├── school-diary.ts
│   └── tasks.ts
├── api
│   ├── achievements.ts
│   ├── alarms.ts
│   ├── checklists.ts
│   ├── child-home.ts
│   ├── children.ts
│   ├── cinema.ts
│   ├── dashboard.ts
│   ├── day-view.ts
│   ├── emotions.ts
│   ├── knowledge.ts
│   ├── meals.ts
│   ├── notifications.ts
│   ├── parent-nav.ts
│   ├── rewards.ts
│   ├── school-diary.ts
│   ├── task-instances.ts
│   └── templates.ts
├── auth
│   ├── child-session.ts
│   ├── constants.ts
│   ├── current-profile.ts
│   ├── dev-session.ts
│   ├── guards.ts
│   ├── index.ts
│   ├── pin.ts
│   ├── pin-validation.ts
│   ├── role.ts
│   └── types.ts
├── day-templates
│   ├── balance.ts
│   ├── constants.ts
│   ├── date.ts
│   ├── kind-inference.ts
│   ├── plan-items.ts
│   ├── school-calendar.ts
│   ├── time.ts
│   ├── timeline.ts
│   └── types.ts
├── demo
│   ├── achievements-store.ts
│   ├── alarms-store.ts
│   ├── cinema-store.ts
│   ├── day-templates-store.ts
│   ├── gamification-store.ts
│   ├── knowledge-store.ts
│   ├── school-diary-store.ts
│   └── wellbeing-store.ts
├── domain
│   ├── achievements.test.ts
│   ├── achievements.ts
│   ├── alarms.ts
│   ├── assignments.ts
│   ├── checklists.ts
│   ├── cinema-rotation.test.ts
│   ├── cinema-rotation.ts
│   ├── dashboard.ts
│   ├── emotion-logs.ts
│   ├── knowledge.test.ts
│   ├── knowledge.ts
│   ├── meals.ts
│   ├── points.ts
│   └── task-status.ts
├── hooks
│   ├── useCurrentTime.ts
│   ├── useFeedbackPreferences.ts
│   ├── useFormField.ts
│   ├── useParentNavBadges.ts
│   ├── useTaskInstanceStatus.ts
│   └── useTheme.ts
├── navigation
│   ├── parent-breadcrumb.ts
│   └── parent-nav-badges.ts
├── preferences
│   ├── feedback.ts
│   └── onboarding.ts
├── supabase
│   ├── admin.ts
│   ├── client.ts
│   ├── env.ts
│   ├── middleware.ts
│   ├── route.ts
│   └── server.ts
├── time
│   ├── daylight.ts
│   ├── family-location.server.ts
│   └── family-location.ts
└── utils
    ├── haptic.ts
    ├── index.ts
    ├── network.ts
    ├── season.ts
    ├── sounds.ts
    └── time.ts
=== styles ===
not found
=== src/styles ===
not found
=== tests ===
not found
=== src/__tests__ ===
src/__tests__
├── child
│   ├── achievements
│   │   └── achievement-badge.test.tsx
│   ├── checklists
│   │   ├── checklist-card.test.tsx
│   │   └── checklist-item-row.test.tsx
│   ├── cinema
│   │   └── movie-option-card.test.tsx
│   ├── emotions
│   │   └── emotion-picker.test.tsx
│   ├── knowledge
│   │   └── knowledge-card-tile.test.tsx
│   ├── meals
│   │   └── meal-card.test.tsx
│   └── my-day
│       └── child-day-view-live.test.tsx
├── child-home
│   ├── daylight-segmentation.test.ts
│   ├── en-ce-moment-card.test.tsx
│   ├── header-components.test.tsx
│   ├── page.test.tsx
│   └── tools-and-knowledge-card.test.tsx
├── day-templates
│   └── day-templates-overlap.test.ts
├── ds
│   ├── components.test.tsx
│   ├── empty-state.test.tsx
│   ├── skeleton.test.tsx
│   └── toast.test.tsx
├── hooks
│   └── useTheme.test.tsx
├── layout
│   ├── __snapshots__
│   │   ├── parent-nav-config.test.ts.snap
│   │   └── parent-sidebar.test.tsx.snap
│   ├── child-shell-navigation.test.tsx
│   ├── more-menu.test.tsx
│   ├── parent-header.test.tsx
│   ├── parent-nav-config.test.ts
│   └── parent-sidebar.test.tsx
├── timeline
│   ├── day-timeline.test.tsx
│   ├── next-up-banner.test.tsx
│   ├── now-cursor.test.tsx
│   └── timeline-task-card.test.tsx
├── timers
│   ├── circular-timer.test.tsx
│   └── pomodoro-view.test.tsx
├── alarms-domain.test.ts
├── assignation-domain.test.ts
├── auth-pages.test.tsx
├── button.test.tsx
├── calendar-panel.test.tsx
├── checklists-domain.test.ts
├── ChildAlarmCenter.test.tsx
├── dashboard-domain.test.ts
├── date-display.test.tsx
├── day-view.test.ts
├── emotion-logs-domain.test.ts
├── meals-domain.test.ts
├── month-strip.test.tsx
├── ParentAlarmsManager.test.tsx
├── ParentDashboard.test.tsx
├── points-domain.test.ts
├── school-calendar.test.ts
├── season-utils.test.ts
├── timeline-helpers.test.ts
├── time-utils.test.ts
└── use-current-time.test.tsx
=== __tests__ ===
not found
=== docs ===
docs
├── accessibility.md
├── alarms-module.md
├── animations-and-feedback.md
├── architecture-overview.md
├── backlog-phase2-priorise.md
├── child-home.md
├── child-home-logic.md
├── child-home-redesign.md
├── child-modules-redesign.md
├── cinema-module.md
├── day-templates-and-school-calendar.md
├── day-templates-and-timeline.md
├── design-system.md
├── design-system-basics.md
├── design-system-brief-v1.md
├── existant-produit-ezra.md
├── family-meals-and-emotions.md
├── gamification-and-timers.md
├── knowledge-and-achievements.md
├── navigation-map-devices.md
├── notifications.md
├── page-specs-parent-enfant.md
├── parent-dashboard.md
├── parent-dashboard-and-modules.md
├── parent-layout-and-nav.md
├── product-ux-overview.md
├── project-snapshot.md
├── pwa-behavior.md
├── school-diary-and-checklists.md
├── timeline-and-focus.md
├── ui-time-calendar.md
└── ux-blueprint-premium.md
```

### 2.2 Purpose of top folders
- `src/app`: Next App Router entrypoints (pages/layouts/loading/templates) and API route handlers.
- `src/components`: UI layers: domain screens (`child/*`, `parent/*`), timeline widgets (`timeline/*`), DS primitives (`ds/*`), layout shells (`layout/*`).
- `src/lib`: app logic and data access (server actions, API services, domain rules, hooks, Supabase clients, demo fallback stores).
- `styles` / `src/styles`: `not found`; global styling is in `src/app/globals.css`.
- `tests` / `__tests__` (root): `not found`; tests are under `src/__tests__` and `e2e`.
- `docs`: product and architecture docs.

## 3) Routing map for "Ma journee" and "Timeline"

### 3.1 Exact routes and file paths
| UX target | URL | Route file path | Evidence |
|---|---|---|---|
| Child home simplified now/next card | `/child` | `src/app/(child)/child/page.tsx` | route returns `ChildHomeLive` |
| "Ma journee" page | `/child/my-day` | `src/app/(child)/child/my-day/page.tsx` | fetches day timeline data and renders `ChildDayViewLive` |
| Timeline View (mobile) | `/child/my-day` (same route) | `src/components/child/my-day/child-day-view-live.tsx` | `mobileViewMode` toggles `guided` vs `timeline` (`:851-878`) |
| Focus sub-route | `/child/focus/[instanceId]` | `src/app/(child)/child/focus/[instanceId]/page.tsx` | my-day tab `matchPrefixes` includes `/child/focus` (`src/components/layout/child-shell.tsx:164`) |

Conclusion: no dedicated `/child/timeline` route was found; Timeline View is a mode inside `/child/my-day`.

### 3.2 Required string search results
Search scope: `src`, `e2e`, `docs`.

- `"Ma journée"`: found in tests/docs; UI heading code uses `"Ma journee"` (`src/components/child/my-day/child-day-view-live.tsx:815`).
- `"Timeline"`: found in mode switch and tests (`src/components/child/my-day/child-day-view-live.tsx:328`).
- `"Maintenant"`: found in now/timeline UI (`src/components/child/home/child-home-now-card.tsx:192`, `src/components/timeline/next-up-banner.tsx:40`).
- `"Ensuite"`: found in now/timeline UI (`src/components/child/home/child-home-now-card.tsx:233`, `src/components/timeline/next-up-banner.tsx:29,44,54`).
- `"Plus tard"`: found in guided section (`src/components/child/my-day/child-day-view-live.tsx:536`).
- `"Je continue"`: `not found`.
- `"Voir ma journée"` (accented): `not found`.
- `"Voir ma journee"` (unaccented): found (`src/components/child/home/child-home-now-card.tsx:262`).

## 4) Component inventory for these screens

### 4.1 Route-level and screen components
| Component | Path | Client/server | Key props (type defs) | Used in |
|---|---|---|---|---|
| `ChildHomePage` | `src/app/(child)/child/page.tsx` | server | route component | URL `/child` |
| `ChildHomeLive` | `src/components/child/child-home-live.tsx` | client | `data`, `initialDateIso`, `timezone`, `isLoading` (`:9`) | `src/app/(child)/child/page.tsx`, `src/app/(child)/child/loading.tsx` |
| `TodayHeader` | `src/components/child/home/today-header.tsx` | client | `date`, `timezone`, `className`, `isLoading` (`:7`) | local in `ChildHomeLive` |
| `ChildHomeNowCard` | `src/components/child/home/child-home-now-card.tsx` | client | `nowState`, `currentTask`, `nextTask`, `activeSchoolBlockEndTime`, `className`, `isLoading` (`:17`) | local in `ChildHomeLive` |
| `ToolsAndKnowledgeCard` | `src/components/child/home/tools-and-knowledge-card.tsx` | client | `className` (`:9`) | local in `ChildHomeLive` |
| `ChildMyDayPage` | `src/app/(child)/child/my-day/page.tsx` | server | route component | URL `/child/my-day` |
| `ChildDayViewLive` | `src/components/child/my-day/child-day-view-live.tsx` | client | `instances`, `templateBlocks`, `dayContext`, `templateName`, `initialDailyPointsTotal`, `rewardTiers`, `hasTemplate`, `childName`, `isLoading`, `v2Enabled`, `timelineItems`, `currentContextItem`, `currentActionItem`, `nextTimelineItem`, `dayBalance` (`:38`) | `src/app/(child)/child/my-day/page.tsx`, `src/app/(child)/child/my-day/loading.tsx` |
| `ChildShell` | `src/components/layout/child-shell.tsx` | client | `children`, `checklistBadgeCount`, `childProfileId`, `childDisplayName` (`:23`) | `src/app/(child)/layout.tsx` |
| `TabBar` | `src/components/ds/tab-bar.tsx` | client | `items`, `className` (`:37`) | imported in `src/components/layout/child-shell.tsx` via DS barrel |

### 4.2 Timeline-related components used by `/child/my-day`
| Component | Path | Client/server | Key props | Used in |
|---|---|---|---|---|
| `DailyProgressBar` | `src/components/timeline/daily-progress-bar.tsx` | shared | `pointsEarned`, `pointsTarget`, `tasksCompleted`, `tasksTotal` (`:3`) | imported in `src/components/child/my-day/child-day-view-live.tsx` |
| `DayTimeline` | `src/components/timeline/day-timeline.tsx` | client | `tasks`, `blocks`, `dayContext`, `currentTime`, `pendingInstanceId`, `pointsFlyUpByInstanceId`, `onStatusChange`, `onFocusMode`, `childName`, `showBanner`, `compact`, `autoScrollToCurrent`, `showDetailPanel`, `className` (`:22`) | imported in `src/components/child/my-day/child-day-view-live.tsx` |
| `NextUpBanner` | `src/components/timeline/next-up-banner.tsx` | client | `currentTask`, `nextTask`, `currentMessage`, `className` (`:13`) | imported in `src/components/timeline/day-timeline.tsx` |
| `NowCursor` | `src/components/timeline/now-cursor.tsx` | client | range/timeline sizing + optional currentTime/label props (`:9`) | imported in `src/components/timeline/day-timeline.tsx` |
| `TimeAxis` | `src/components/timeline/time-axis.tsx` | shared | markers/range/height props (`:3`) | imported in `src/components/timeline/day-timeline.tsx` |
| `TimelineTaskCard` | `src/components/timeline/timeline-task-card.tsx` | client | instance metadata, status/phase flags, action callbacks, density/select props (`:13`) | imported in `src/components/timeline/day-timeline.tsx` |
| `PointsFlyUp` | `src/components/timeline/points-fly-up.tsx` | client | `points`, `sequence` (`:5`) | imported in `src/components/timeline/timeline-task-card.tsx` |

### 4.3 Internal subcomponents inside `ChildDayViewLive`
All local to `src/components/child/my-day/child-day-view-live.tsx`:
- `MobileModeToggle` (`:301`)
- `CurrentFocusCard` (`:334`)
- `NextTaskCard` (`:439`)
- `DayBalanceUnitsCard` (`:480`)
- `LaterTasksCard` (`:526`)
- `HelpCard` (`:568`)

## 5) Required short excerpts (10-30 lines each)

### 5.1 Top-level route file (`/child/my-day`)
File: `src/app/(child)/child/my-day/page.tsx`
```tsx
54: export default async function ChildMyDayPage(): Promise<React.JSX.Element> {
55:   const context = await getCurrentProfile();
56:   const profileId = context.profile?.id;
57:   const timelineData = profileId ? await getTodayTemplateWithTasksForProfileV2(profileId) : getEmptyTimelineData();
58:
59:   return (
60:     <ChildDayViewLive
61:       instances={timelineData.instances}
62:       templateBlocks={timelineData.blocks}
63:       dayContext={timelineData.dayContext}
64:       templateName={timelineData.template?.name ?? "Journee type"}
65:       initialDailyPointsTotal={timelineData.dailyPoints?.pointsTotal ?? 0}
66:       rewardTiers={timelineData.rewardTiers}
67:       hasTemplate={Boolean(timelineData.template)}
68:       childName={getFirstName(context.profile?.display_name)}
69:       v2Enabled={timelineData.v2Enabled}
70:       timelineItems={timelineData.timelineItems}
71:       currentContextItem={timelineData.currentContextItem}
72:       currentActionItem={timelineData.currentActionItem}
73:       nextTimelineItem={timelineData.nextTimelineItem}
74:       dayBalance={timelineData.dayBalance}
```

### 5.2 Hero/Now card component
File: `src/components/child/home/child-home-now-card.tsx`
```tsx
186:                 <motion.span
187:                   className="inline-flex h-touch-sm items-center gap-1.5 rounded-radius-pill border border-brand-primary/32 bg-brand-primary/14 px-3 text-xs font-black uppercase tracking-wide text-brand-primary"
188:                   animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0.88, 1, 0.88] }}
189:                   transition={{ duration: 1.7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
190:                 >
191:                   <SparkIcon className="size-3.5" />
192:                   Maintenant
193:                 </motion.span>
194:
195:                 <p className="text-2xl font-black leading-tight text-text-primary md:text-xl xl:text-2xl">{currentContent.title}</p>
196:                 <p className="text-sm font-semibold text-text-secondary md:text-sm">{currentContent.timeLabel}</p>
197:               </div>
198:
199:               <div className="relative shrink-0">
200:                 <span
201:                   aria-hidden="true"
202:                   className={cn(
203:                     "pointer-events-none absolute inset-0 rounded-radius-pill opacity-55 blur-md",
204:                     currentVisual.haloClass,
205:                     prefersReducedMotion ? "" : "motion-safe:animate-pulse",
206:                   )}
207:                 />
208:                 <span
209:                   data-testid={currentTaskTypeIconTestId}
210:                   className={cn(
```

### 5.3 Timeline component switch section
File: `src/components/child/my-day/child-day-view-live.tsx`
```tsx
851:           <div className="space-y-3 lg:hidden">
852:             <MobileModeToggle mode={mobileViewMode} onChange={setMobileViewMode} />
853:
854:             {mobileViewMode === "guided" ? (
855:               <div className="space-y-3">
856:                 <CurrentFocusCard
857:                   currentTask={effectiveCurrentTask}
858:                   nextTask={nextTask}
859:                   currentContextItem={liveCurrentContextItem}
860:                   nextTimelineItem={liveNextTimelineItem}
861:                   dayContext={dayContext}
862:                   currentMinutes={currentMinutes}
863:                   pendingInstanceId={pendingInstanceId}
864:                   onStatusChange={handleStatusChange}
865:                   onFocusMode={handleFocusMode}
866:                 />
867:                 <NextTaskCard nextTask={nextTask} nextTimelineItem={liveNextTimelineItem} />
868:                 <LaterTasksCard tasks={laterTasks.slice(0, 5)} currentMinutes={currentMinutes} />
869:                 <HelpCard />
870:                 <Button size="lg" variant="secondary" fullWidth onClick={() => setMobileViewMode("timeline")}>
871:                   Voir la timeline
872:                 </Button>
873:               </div>
874:             ) : (
875:               <div className="space-y-3">
876:                 <DayTimeline
877:                   tasks={timelineTasks}
878:                   blocks={templateBlocks}
```

### 5.4 Bottom navigation component
File: `src/components/layout/child-shell.tsx`
```tsx
150:   const childTabs: TabBarItemConfig[] = React.useMemo(
151:     () => [
152:       {
153:         href: "/child",
154:         label: "Accueil",
155:         icon: <HomeIcon active={false} />,
156:         activeIcon: <HomeIcon active />,
157:       },
158:       {
159:         href: "/child/my-day",
160:         label: "Ma journée",
161:         shortLabel: "Journée",
162:         icon: <DayIcon active={false} />,
163:         activeIcon: <DayIcon active />,
164:         matchPrefixes: ["/child/my-day", "/child/focus"],
165:       },
```

## 6) Data/state model inventory (UI drivers)

### 6.1 Sources of truth
#### Schedule/day items
Primary Supabase tables and flow:
- `day_templates` and `template_tasks` define day plans (`supabase/migrations/20260211100000_day_templates_timeline.sql`).
- `day_template_blocks` and `school_periods` define contextual blocks (`supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql`).
- `task_instances` stores per-day actionable instances and status (`supabase/migrations/20260211130000_gamification_points_timers.sql`).
- Data aggregation in `src/lib/api/day-view.ts`:
  - V2 conversion: `toTimelineV2Data` (`:240-264`)
  - Main fetches: `profiles`, `task_instances`, `reward_tiers`, `day_template_blocks`, `school_periods`, `template_tasks`, `task_categories`, `knowledge_cards` (`:369-559`)
  - Public loader used by page: `getTodayTemplateWithTasksForProfileV2` (`:572-589`)
- Missing instance generation for today: `src/lib/actions/ensure-today-instances.ts`.

#### Task statuses
- TS type union: `TaskInstanceStatus = "a_faire" | "en_cours" | "termine" | "en_retard" | "ignore"` (`src/lib/day-templates/types.ts:81`).
- DB status constraint in migration (`20260211130000_gamification_points_timers.sql:10`).
- Transition rules (`src/lib/domain/task-status.ts`):
  - `a_faire -> en_cours|termine`
  - `en_cours -> termine`
- `paused` status: `not found` in schema/types.

#### Rewards/points
- Tables: `reward_tiers`, `daily_points` (`20260211130000_gamification_points_timers.sql:20-39`).
- Points computation: `src/lib/domain/points.ts` (`computePointsForTransition`, `computeNextRewardProgress`).
- Status update action updates task + daily points: `src/lib/actions/tasks.ts`.
- UI consumption in my-day: `src/components/child/my-day/child-day-view-live.tsx:843-848` and `src/components/timeline/daily-progress-bar.tsx`.
- Separate "stars" scoring system: `not found` (star icon exists, but progression logic is points-based).

### 6.2 Key types/interfaces
- `TaskInstanceSummary`: `src/lib/day-templates/types.ts:83`
- `RewardTierSummary`: `src/lib/day-templates/types.ts:110`
- `DailyPointsSummary`: `src/lib/day-templates/types.ts:119`
- `TodayTimelineData`: `src/lib/day-templates/types.ts:132`
- `DayTimelineItemSummary`: `src/lib/day-templates/types.ts:142`
- `DayBalanceSummary`: `src/lib/day-templates/types.ts:174`
- `TodayTimelineV2Data`: `src/lib/day-templates/types.ts:194`

### 6.3 Services/hooks/actions involved
- `src/lib/api/day-view.ts`: server-side day/timeline data retrieval and v2 conversion.
- `src/lib/api/child-home.ts`: simplified home card data (`nowState`, current/next task, points summary).
- `src/lib/actions/tasks.ts`: server action for task status transitions and points increments.
- API route handlers also exist under `src/app/api` (`auth/child/pin`, `auth/child/pin-config`, `auth/parent/login`, `auth/parent/logout`, `auth/parent/register`, `parent/nav-badges`).
- `src/lib/day-templates/plan-items.ts`: unified timeline items and context/action detection.
- `src/lib/day-templates/timeline.ts`: task sorting and current/next extraction.
- `src/lib/day-templates/balance.ts`: 15-minute bucket balance calculation.
- `src/lib/hooks/useCurrentTime.ts`: live time ticking.
- `src/lib/hooks/useTaskInstanceStatus.ts`: appears unused (no imports found), potential duplicate state-update abstraction.

## 7) Design System inventory

### 7.1 DS implementation
- Custom DS lives in `src/components/ds` and is exported via `src/components/ds/index.ts`.
- DS primitives used by target screens: `Button`, `Card`, `Badge`, `ProgressBar`, `TabBar`, `Modal`, `Toast`.
- Variants implemented with `class-variance-authority` in DS components (`src/components/ds/button.tsx`).
- Probe for common external DS kits (`shadcn`, `@radix-ui`, `lucide-react`, `mui`, `antd`) found no matches.

### 7.2 Token sources
- CSS variables/tokens in `src/app/globals.css:20-100` (colors, radii, shadows, motion, spacing).
- Tailwind token bindings/extensions in `tailwind.config.ts`:
  - color maps from `--color-*`
  - spacing (`touch-sm`, `touch-md`, `touch-lg`, `18/22/26/30`)
  - radius tokens (`radius-card`, `radius-pill`, `radius-button`)
  - shadow tokens (`card`, `glass`, `elevated`)

### 7.3 Typography
- Font loading in `src/app/layout.tsx:2,9-25`: `Inter`, `Nunito`, `Baloo_2` via `next/font/google`.
- Tailwind font family mapping in `tailwind.config.ts` (`fontFamily.sans`, `fontFamily.display`).
- Atkinson Hyperlegible: `not found`.

### 7.4 Icon library
- Custom SVG icon set: `src/components/child/icons/child-premium-icons.tsx`.
- Used by home card, timeline cards, and child bottom nav.
- No external icon package usage found.

## 8) Testing and quality gates inventory

### 8.1 Frameworks/config
- Unit/integration: Vitest + Testing Library (`vitest.config.ts`, `vitest.setup.ts`).
- E2E: Playwright (`playwright.config.ts`, tests in `e2e`).
- Storybook: `@storybook/react-vite` with Next mocks (`.storybook/main.ts`, `.storybook/preview.tsx`).
- Jest: `not found`.
- Cypress: `not found`.
- CI workflows in `.github/workflows`: `not found`.

### 8.2 Existing tests related to child home / my-day / timeline
Unit/integration:
- `src/__tests__/child/my-day/child-day-view-live.test.tsx`
- `src/__tests__/timeline/day-timeline.test.tsx`
- `src/__tests__/timeline/next-up-banner.test.tsx`
- `src/__tests__/timeline/now-cursor.test.tsx`
- `src/__tests__/timeline/timeline-task-card.test.tsx`
- `src/__tests__/child-home/en-ce-moment-card.test.tsx`
- `src/__tests__/child-home/page.test.tsx`
- `src/__tests__/child-home/header-components.test.tsx`

E2E:
- `e2e/child-home.spec.ts`
- `e2e/child-my-day.spec.ts`
- `e2e/visual-qa-complete.spec.ts`
- Related flows touching `/child/my-day`: `e2e/child-gamification.spec.ts`, `e2e/cinema.spec.ts`, `e2e/knowledge-and-achievements.spec.ts`, `e2e/assignation-and-dashboard.spec.ts`, `e2e/parent-rewards.spec.ts`

### 8.3 Local quality commands
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Build: `npm run build`
- Dev: `npm run dev`


## 9) Known constraints and refactor risks (evidence-based)

### 9.1 Tight coupling areas
- `ChildDayViewLive` combines orchestration + optimistic updates + guided mode + timeline mode + focus navigation in one file (`src/components/child/my-day/child-day-view-live.tsx`).
- `DayTimeline` includes rendering, detail panel actions, now-banner logic, and autoscroll behavior in one component (`src/components/timeline/day-timeline.tsx`).
- Data coupling chain for my-day is cross-layer:
  - DB tables/migrations (`supabase/migrations/...`)
  - API mappers (`src/lib/api/day-view.ts`)
  - page props (`src/app/(child)/child/my-day/page.tsx`)
  - client rendering (`src/components/child/my-day/child-day-view-live.tsx`)

### 9.2 Pitfalls for refactoring Ma journee / Timeline
- Timeline View is mode state, not a route. Refactors that split routes can break mobile behavior (`mobileViewMode` in `child-day-view-live.tsx:851-894`).
- Dual-path logic exists for day-plan v2 feature flag (`src/lib/api/day-view.ts:240-264`; `src/components/child/my-day/child-day-view-live.tsx:643-680`).
- Supabase and demo fallback paths must both stay consistent (`src/lib/api/day-view.ts:286-352` and `:354+`).
- Status transitions are constrained and validated at DB + domain + action layers (migration constraint + `task-status.ts` + `actions/tasks.ts`).

### 9.3 Likely legacy/duplicate implementations (targeted domain)
- `src/lib/hooks/useTaskInstanceStatus.ts`: no import usages found; overlaps with inline status-update logic in `ChildDayViewLive`.
- Two timeline helper paradigms coexist:
  - `src/lib/day-templates/timeline.ts` (task-only current/next)
  - `src/lib/day-templates/plan-items.ts` (v2 unified timeline/context/actions)
- Legacy route alias: `src/app/(parent)/parent/gamification/page.tsx` redirects to `/parent/rewards`.
- Label drift between docs and code CTA:
  - docs mention `Continuer ma journee`
  - code uses `Voir ma journee` in `src/components/child/home/child-home-now-card.tsx:262`

## 10) Read-only command log and key outputs

Commands executed were read-only (`Get-Content`, `Get-ChildItem`, `rg`, `Test-Path`, custom PowerShell tree printers). No tests were run.

Main command groups and outcomes:
1. Root/config presence scans: confirmed config files and lockfiles; confirmed missing files (`src/pages`, `pages`, Jest/Cypress configs, `.github/workflows`, `.env.example`).
2. File content reads: loaded all cited config, route, component, API/action/domain, and migration files.
3. Depth-limited tree generation: produced full trees (depth <= 4) for requested directories.
4. Route derivation: generated URL-to-`page.tsx` mapping from `src/app`.
5. String scans: executed required term searches (`Ma journée`, `Timeline`, `Maintenant`, `Ensuite`, `Plus tard`, `Je continue`, `Voir ma journée`).
6. Import usage tracing: mapped where key components are imported.
7. Test inventory scans: listed relevant unit and e2e files.
8. Supabase schema scans: identified day/timeline/points/reward tables and constraints from migrations.

Retry note:
- Early `rg` commands using Windows glob syntax (example: `docs/*.md`) returned path syntax errors and were rerun successfully using directory targets.

### 10.1 Exact command strings used (representative full list)
The following read-only command strings were executed during this snapshot (some repeated with different targets):

1. `Get-Location; Get-ChildItem -Force`
2. `foreach ($f in ...) { \"$f`t$(Test-Path $f)\" }`
3. `Get-Content package.json`
4. `Get-Content tsconfig.json`
5. `Get-Content next.config.ts`
6. `Get-Content tailwind.config.ts`
7. `Get-Content postcss.config.mjs`
8. `Get-Content eslint.config.mjs`
9. `Get-Content .prettierrc.json`
10. `Get-Content .prettierignore`
11. `Get-Content vitest.config.ts`
12. `Get-Content vitest.setup.ts`
13. `Get-Content playwright.config.ts`
14. Custom recursive PowerShell tree printer for targets (`app`, `src/app`, `pages`, `src/pages`, `components`, `src/components`, `lib`, `src/lib`, `styles`, `src/styles`, `tests`, `src/__tests__`, `__tests__`, `docs`) with max depth 4
15. `rg -n --hidden -S \"Ma journée|Timeline|Maintenant|Ensuite|Plus tard|Je continue|Voir ma journée\" src docs e2e`
16. `rg -n --hidden -S \"my-day|timeline|day-view|day timeline|journee|journée\" src e2e docs`
17. `Get-Content src/app/(child)/child/page.tsx`
18. `Get-Content src/app/(child)/child/my-day/page.tsx`
19. `Get-Content src/components/child/my-day/child-day-view-live.tsx`
20. `Get-Content src/components/layout/child-shell.tsx`
21. `Get-Content src/components/child/home/child-home-now-card.tsx`
22. `Get-Content src/components/timeline/day-timeline.tsx`
23. `Get-Content src/components/timeline/timeline-task-card.tsx`
24. `Get-Content src/components/timeline/next-up-banner.tsx`
25. `Get-Content src/components/timeline/now-cursor.tsx`
26. `Get-Content src/components/timeline/time-axis.tsx`
27. `Get-Content src/components/timeline/daily-progress-bar.tsx`
28. `Get-Content src/app/layout.tsx`
29. `Get-Content src/app/globals.css`
30. `Get-Content src/components/ds/index.ts`
31. `Get-Content src/components/ds/button.tsx`
32. `Get-Content src/components/ds/card.tsx`
33. `Get-Content src/components/ds/tab-bar.tsx`
34. `Get-Content src/lib/api/day-view.ts`
35. `Get-Content src/lib/day-templates/types.ts`
36. `Get-Content src/lib/actions/tasks.ts`
37. `Get-Content src/lib/domain/points.ts`
38. `Get-Content src/lib/day-templates/plan-items.ts`
39. `Get-Content src/lib/day-templates/timeline.ts`
40. `Get-Content src/lib/day-templates/balance.ts`
41. `Get-Content src/lib/domain/task-status.ts`
42. `Get-Content src/lib/api/child-home.ts`
43. `Get-Content src/lib/supabase/env.ts`
44. `Get-Content src/lib/supabase/client.ts`
45. `Get-Content src/lib/supabase/server.ts`
46. `Get-Content src/lib/supabase/admin.ts`
47. `Get-Content src/lib/supabase/middleware.ts`
48. `Get-Content src/lib/supabase/route.ts`
49. `Get-Content supabase/config.toml`
50. `Get-Content supabase/seed.sql | Select-Object -First ...`
51. `rg -n \"create table|alter table|task_instances|template_tasks|day_templates|day_template_blocks|reward_tiers|daily_points|plan_items|status\" supabase/migrations`
52. `Get-Content supabase/migrations/...sql` (key migrations for timeline/points/v2)
53. `Get-ChildItem .github/workflows` (result: not found)
54. `Get-Content .storybook/main.ts`
55. `Get-Content .storybook/preview.tsx`
56. `Get-Content middleware.ts`
57. `Get-ChildItem -Recurse -Filter page.tsx src/app` + derived route mapping script
58. `rg --files src/__tests__ | rg \"child-home|child\\\\my-day|timeline|day-view\"`
59. `rg --files e2e | rg \"child-home|child-my-day|timeline|visual-qa|...\"`
60. `Get-Content e2e/child-home.spec.ts`
61. `Get-Content e2e/child-my-day.spec.ts`
62. `Get-Content src/__tests__/child/my-day/child-day-view-live.test.tsx`
63. `Get-Content src/__tests__/timeline/day-timeline.test.tsx`
64. `Get-Content src/__tests__/child-home/en-ce-moment-card.test.tsx`

Observed outputs from these commands are reflected in the sections above (file existence, tree output, route mapping, config keys, string hits, and component/data/test inventory).

## 11) Explicit not-found list
- `app/` (root-level): not found
- `pages/` and `src/pages/`: not found
- `components/` and `lib/` at root: not found
- `styles/` and `src/styles/`: not found
- root `tests/` and `__tests__/`: not found
- `.env.example`: not found
- Jest config: not found
- Cypress config: not found
- `.github/workflows`: not found
- string `Je continue`: not found
- string `Voir ma journée` (accented): not found
- Atkinson Hyperlegible font usage: not found

