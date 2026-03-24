# Project Snapshot - Ezra

Generated: 2026-03-01 (local workspace snapshot)
Scope: read-only repository inspection + this report file creation.

## 1) Stack and Tooling (evidence-based)

### 1.1 Config and project files discovered

| File | Status | Evidence |
|---|---|---|
| `package.json` | found | scripts/deps/devDeps at `package.json:5-65` |
| `package-lock.json` | found | lockfile present (`package-lock.json` exists) |
| `pnpm-lock.yaml` | not found | existence check returned false |
| `yarn.lock` | not found | existence check returned false |
| `tsconfig.json` | found | strict TS keys at `tsconfig.json:11-31` |
| `next.config.ts` | found | PWA + headers + strict mode at `next.config.ts:2-101` |
| `tailwind.config.ts` | found | content scan + theme extensions at `tailwind.config.ts:15-138` |
| `postcss.config.mjs` | found | Tailwind + Autoprefixer at `postcss.config.mjs:3-4` |
| `eslint.config.mjs` | found | Next + TS + Prettier extends at `eslint.config.mjs:11-21` |
| `.prettierrc.json` | found | prettier options + tailwind plugin at `.prettierrc.json:2-6` |
| `vitest.config.ts` | found | jsdom, includes, coverage at `vitest.config.ts:4-25` |
| `playwright.config.ts` | found | testDir `./e2e`, webServer, mock auth env at `playwright.config.ts:6-30` |
| `.storybook/main.ts`, `.storybook/preview.tsx` | found | Storybook 8 + Vite config and decorators |
| `supabase/config.toml`, `supabase/migrations/*` | found | project id and DB version at `supabase/config.toml:1-4` |
| `.env.local` | found | keys present (see env key list below) |
| `.env.example` | not found | file discovery returned none |
| `.github/workflows` | not found | explicit path check returned `not found` |
| `jest.config.*` | not found | file discovery returned none |
| `cypress.config.*` | not found | file discovery returned none |

### 1.2 Framework, runtime, language, and build model

| Area | Finding | Proof |
|---|---|---|
| Framework | Next.js 15 | `package.json:31` (`"next": "^15.5.12"`) |
| Router model | App Router (not Pages Router) | routes under `src/app/**`; `src/pages` not found |
| React | React 19 | `package.json:32-33` |
| Language | TypeScript strict mode | `tsconfig.json:11-14` (`strict`, `noImplicitAny`, etc.) |
| Path alias | `@/* -> ./src/*` | `tsconfig.json:30-32` |
| Linting | ESLint 9 + `next/core-web-vitals` + TS | `eslint.config.mjs:11` |
| Formatting | Prettier + `prettier-plugin-tailwindcss` | `.prettierrc.json:2-6` |
| CSS pipeline | Tailwind CSS + PostCSS + Autoprefixer | `tailwind.config.ts`, `postcss.config.mjs:3-4` |
| PWA | `@ducanh2912/next-pwa` with offline fallback | `next.config.ts:2`, `:38-45` |
| Storybook | Storybook 8 with `@storybook/react-vite` | `.storybook/main.ts:2-8` |
| Unit test | Vitest + jsdom + Testing Library | `vitest.config.ts:4-25`, deps in `package.json:44-46,65` |
| E2E test | Playwright | `package.json:38`, `playwright.config.ts:1-7` |
| Data backend | Supabase client/server/admin + SQL migrations | `src/lib/supabase/*`, `supabase/migrations/*` |

### 1.3 Scripts and local commands (source of truth: `package.json`)

| Purpose | Command | Location |
|---|---|---|
| dev server | `npm run dev` -> `next dev` | `package.json:6` |
| production build | `npm run build` -> `next build` | `package.json:7` |
| start built app | `npm run start` -> `next start` | `package.json:8` |
| lint | `npm run lint` -> `eslint . --max-warnings=0` | `package.json:9` |
| typecheck | `npm run typecheck` -> `tsc --noEmit` | `package.json:10` |
| unit tests | `npm run test` -> `vitest run` | `package.json:13` |
| unit tests watch | `npm run test:watch` -> `vitest` | `package.json:14` |
| e2e tests | `npm run test:e2e` -> `playwright test` | `package.json:15` |
| storybook dev | `npm run storybook` | `package.json:16` |
| storybook build | `npm run storybook:build` | `package.json:17` |
| generated DB types | `npm run db:types` | `package.json:18` |

### 1.4 Environment/runtime assumptions found

Environment key names found in `.env.local` (values not copied):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CHILD_SESSION_SECRET`
- `EZRA_DEV_AUTH_BYPASS`
- `DAY_PLAN_V2`
- `NEXT_PUBLIC_DAY_PLAN_V2`
- `OPENWEATHERMAP_API_KEY`
- `OPENAI_API_KEY`

Docs/runtime evidence:
- README base env template (Supabase + auth): `README.md:31-35`
- Supabase env checks: `src/lib/supabase/env.ts:1-38`
- V2 feature flag resolver: `src/config/feature-flags.ts:10-11`

## 2) Repository Structure Map (depth <= 4)

### 2.1 Top-level route/component/lib/test/docs roots requested

Root-level folders requested by brief:
- `app/` not found
- `pages/` not found
- `components/` not found
- `lib/` not found
- `styles/` not found
- `tests/` not found
- `__tests__/` not found

`src/`-based equivalents:
- `src/app` found
- `src/pages` not found
- `src/components` found
- `src/lib` found
- `src/styles` not found
- `src/__tests__` found
- `docs` found

### 2.2 Trees (captured by read-only PowerShell recursion)

#### `src/app`

```text
src/app
  (auth)/
    auth/
      login/
        page.tsx
      page.tsx
      pin/
        page.tsx
      register/
        page.tsx
    layout.tsx
    template.tsx
  (child)/
    child/
      achievements/
        loading.tsx
        page.tsx
      checklists/
        loading.tsx
        page.tsx
      cinema/
        loading.tsx
        page.tsx
      emotions/
        loading.tsx
        page.tsx
      focus/
        [instanceId]/
      knowledge/
        loading.tsx
        page.tsx
      loading.tsx
      meals/
        loading.tsx
        page.tsx
      my-day/
        loading.tsx
        page.tsx
        timeline/
      page.tsx
      revisions/
        [cardId]/
      tools/
        page.tsx
    layout.tsx
    template.tsx
  (parent)/
    layout.tsx
    parent/
      achievements/
        loading.tsx
        page.tsx
      alarms/
        page.tsx
      categories/
        page.tsx
      checklists/
        loading.tsx
        page.tsx
      cinema/
        page.tsx
      dashboard/
        loading.tsx
        page.tsx
      day-templates/
        [id]/
        loading.tsx
        page.tsx
      gamification/
        page.tsx
      knowledge/
        [subjectId]/
        page.tsx
      meals/
        loading.tsx
        page.tsx
      notifications/
        page.tsx
      page.tsx
      rewards/
        loading.tsx
        page.tsx
      school-diary/
        loading.tsx
        page.tsx
      settings/
        page.tsx
  ~offline/
    page.tsx
  api/
    auth/
      _utils.ts
      child/
        pin/
        pin-config/
      parent/
        login/
        logout/
        register/
    csp-report/
      route.ts
    parent/
      nav-badges/
        route.ts
  csp-test/
    page.tsx
  error.tsx
  favicon.ico
  globals.css
  layout.tsx
  loading.tsx
  manifest.ts
  not-found.tsx
  page.tsx
```
#### `src/components`

```text
src/components
  calendar/
    CalendarPanel.stories.tsx
    CalendarPanel.tsx
    DateDisplay.tsx
    MonthStrip.tsx
    SeasonBadge.tsx
  child/
    achievements/
      achievement-badge.stories.tsx
      achievement-badge.tsx
      achievement-unlock-celebration.stories.tsx
      achievement-unlock-celebration.tsx
      child-achievements-view.tsx
      index.ts
    checklists/
      checklist-item-row.stories.tsx
      checklist-item-row.tsx
    child-home-live.tsx
    cinema/
      child-cinema-view.tsx
      index.ts
      movie-option-card.stories.tsx
      movie-option-card.tsx
    emotions/
      child-emotions-view.tsx
      emotion-check-in-card.tsx
      emotion-picker.stories.tsx
      emotion-picker.tsx
      index.ts
      week-emotion-strip.tsx
    focus/
      __tests__/
        focus-view.test.tsx
      focus-instructions-sections.tsx
      focus-view.tsx
    home/
      child-home-now-card.tsx
      index.ts
      tools-and-knowledge-card.tsx
    icons/
      child-premium-icons.tsx
    knowledge/
      child-knowledge-view.tsx
      index.ts
      knowledge-card-detail.tsx
      knowledge-card-tile.stories.tsx
      knowledge-card-tile.tsx
      subject-card.stories.tsx
      subject-card.tsx
    meals/
      child-meals-view.tsx
      favorite-meals-list.tsx
      index.ts
      meal-card.stories.tsx
      meal-card.tsx
    my-day/
      active-task-card.tsx
      child-day-timeline-view.tsx
      child-day-view-live.tsx
    revisions/
      __tests__/
        revision-card-view.test.tsx
        revision-quiz.test.tsx
      index.ts
      RevisionCardView.tsx
      RevisionQuiz.tsx
    today/
      index.ts
      time-block-drawer.tsx
      time-grid-timeline.tsx
      today-data.tsx
      today-header.tsx
      today-rewards.tsx
      types.ts
      weekday-strip.tsx
    tomorrow/
      child-tomorrow-view.tsx
      index.ts
  ds/
    avatar.stories.tsx
    avatar.tsx
    badge.stories.tsx
    badge.tsx
    button.stories.tsx
    button.tsx
    card.stories.tsx
    card.tsx
    category-icons.tsx
    empty-state.stories.tsx
    empty-state.tsx
    index.ts
    input.stories.tsx
    input.tsx
    modal.stories.tsx
    modal.tsx
    page-layout.stories.tsx
    page-layout.tsx
    progress-bar.stories.tsx
    progress-bar.tsx
    rich-text-editor.tsx
    select.stories.tsx
    select.tsx
    skeleton.stories.tsx
    skeleton.tsx
    tab-bar.stories.tsx
    tab-bar.tsx
    textarea.stories.tsx
    textarea.tsx
    theme-provider.tsx
    theme-script.tsx
    theme-toggle.stories.tsx
    theme-toggle.tsx
    toast.stories.tsx
    toast.tsx
  feedback/
    child-feedback-banner.tsx
    network-status-banner.tsx
    parent-feedback-banner.tsx
  knowledge/
  layout/
    auth-shell.tsx
    child-shell.tsx
    child-theme-lock.tsx
    more-menu.tsx
    parent-header.tsx
    parent-shell.tsx
    parent-sidebar.tsx
    placeholder-page.tsx
```
```text
  missions/
    __tests__/
      focus-mode-mission.test.tsx
      mappers.test.ts
      mission-drawer.test.tsx
      missions-card.test.tsx
    FocusModeMission.tsx
    index.ts
    mappers.ts
    MissionDrawer.tsx
    MissionRow.tsx
    MissionsCard.tsx
    types.ts
    useMissionsToday.ts
  motion/
    fade-in.tsx
    index.ts
    list-stagger.stories.tsx
    list-stagger.tsx
    page-transition.stories.tsx
    page-transition.tsx
    scale-on-tap.tsx
  notifications/
    index.ts
    NotificationBanner.tsx
    NotificationCenter.tsx
  onboarding/
    child-onboarding-overlay.tsx
    parent-onboarding-modal.tsx
  parent/
    dashboard/
      dashboard-date.ts
      emotions-widget.stories.tsx
      emotions-widget.tsx
      index.ts
      kpi-card.stories.tsx
      kpi-card.tsx
      meals-widget.stories.tsx
      meals-widget.tsx
      parent-dashboard-skeleton.tsx
      school-diary-widget.stories.tsx
      school-diary-widget.tsx
      today-load-widget.stories.tsx
      today-load-widget.tsx
      weekly-points-widget.stories.tsx
      weekly-points-widget.tsx
      weekly-tasks-widget.stories.tsx
      weekly-tasks-widget.tsx
  preferences/
    feedback-preferences-card.tsx
  time/
    AnalogClock.stories.tsx
    AnalogClock.tsx
    ClockPanel.stories.tsx
    ClockPanel.tsx
    DigitalClock.stories.tsx
    DigitalClock.tsx
  timeline/
    category-visuals.ts
    daily-progress-bar.tsx
    day-timeline.stories.tsx
    day-timeline.tsx
    index.ts
    next-up-banner.stories.tsx
    next-up-banner.tsx
    now-cursor.tsx
    points-fly-up.tsx
    time-axis.tsx
    timeline-task-card.tsx
  timers/
    circular-timer.stories.tsx
    circular-timer.tsx
    index.ts
    pomodoro-view.stories.tsx
    pomodoro-view.tsx
  weather/
    SunCycle.tsx
    WeatherHero.tsx
    WeatherIcon.tsx
    WeatherPanel.tsx
```

#### `src/lib`

```text
src/lib
  actions/
    achievements.ts
    alarms.ts
    checklists.ts
    cinema.ts
    day-templates.ts
    emotions.ts
    ensure-today-instances.ts
    knowledge.ts
    meals.ts
    notifications.ts
    rewards.ts
    school-diary.ts
    tasks.ts
  api/
    achievements.ts
    alarms.ts
    checklists.ts
    child-home.ts
    children.ts
    cinema.ts
    dashboard.ts
    day-view.ts
    emotions.ts
    knowledge.ts
    meals.ts
    notifications.ts
    parent-nav.ts
    revisions.ts
    rewards.ts
    school-diary.ts
    task-instances.ts
    templates.ts
  auth/
    child-session.ts
    constants.ts
    current-profile.ts
    dev-session.ts
    guards.ts
    index.ts
    pin.ts
    pin-validation.ts
    role.ts
    types.ts
  day-templates/
    balance.ts
    category-validation.ts
    constants.ts
    date.ts
    focus.ts
    instructions.ts
    kind-inference.ts
    plan-items.ts
    school-calendar.ts
    template-task-validation.ts
    time.ts
    timeline.ts
    types.ts
  demo/
    achievements-store.ts
    alarms-store.ts
    cinema-store.ts
    day-templates-store.ts
    gamification-store.ts
    knowledge-store.ts
    revisions-store.ts
    school-diary-store.ts
    wellbeing-store.ts
  domain/
    achievements.test.ts
    achievements.ts
    alarms.ts
    assignments.ts
    checklists.ts
    cinema-rotation.test.ts
    cinema-rotation.ts
    dashboard.ts
    emotion-logs.ts
    knowledge.test.ts
    knowledge.ts
    meals.ts
    points.ts
    task-status.ts
  hooks/
    useCurrentTime.ts
    useFeedbackPreferences.ts
    useFormField.ts
    useParentNavBadges.ts
    useTaskInstanceStatus.ts
    useTheme.ts
  navigation/
    parent-breadcrumb.ts
    parent-nav-badges.ts
  preferences/
    feedback.ts
    onboarding.ts
  revisions/
    index.ts
    mappers.ts
    types.ts
    validation.ts
  supabase/
    admin.ts
    client.ts
    env.ts
    middleware.ts
    route.ts
    server.ts
  time/
    daylight.ts
    day-segments.ts
    family-location.server.ts
    family-location.ts
  utils/
    haptic.ts
    index.ts
    network.ts
    season.ts
    sounds.ts
    time.ts
  weather/
    date.ts
    forecast-aggregation.ts
    openweathermap.ts
    service.ts
    types.ts
```
#### `src/__tests__`

```text
src/__tests__
  alarms-domain.test.ts
  assignation-domain.test.ts
  auth-pages.test.tsx
  button.test.tsx
  calendar-panel.test.tsx
  checklists-domain.test.ts
  child/
    achievements/
      achievement-badge.test.tsx
    checklists/
      checklist-item-row.test.tsx
    cinema/
      movie-option-card.test.tsx
    emotions/
      emotion-picker.test.tsx
    knowledge/
      knowledge-card-tile.test.tsx
    meals/
      meal-card.test.tsx
    my-day/
      child-day-timeline-view.test.tsx
      child-day-view-live.test.tsx
      focus-view-overlay.test.tsx
    revisions/
      child-revision-page.test.tsx
    tomorrow/
      child-tomorrow-view.test.tsx
  ChildAlarmCenter.test.tsx
  child-home/
    daylight-segmentation.test.ts
    day-segments.test.ts
    en-ce-moment-card.test.tsx
    page.test.tsx
    today-data-grouping.test.ts
    today-header-v2.test.tsx
    tools-and-knowledge-card.test.tsx
    weekday-strip.test.tsx
  dashboard-domain.test.ts
  date-display.test.tsx
  day-templates/
    category-icon-validation.test.ts
    day-templates-overlap.test.ts
    instructions.test.ts
    subkind-suggestions-by-category.test.ts
    template-editor-subkind.test.tsx
  day-view.test.ts
  ds/
    category-icons.test.tsx
    components.test.tsx
    empty-state.test.tsx
    skeleton.test.tsx
    toast.test.tsx
  emotion-logs-domain.test.ts
  hooks/
    useTheme.test.tsx
  layout/
    __snapshots__/
      parent-nav-config.test.ts.snap
      parent-sidebar.test.tsx.snap
    child-shell-navigation.test.tsx
    more-menu.test.tsx
    parent-header.test.tsx
    parent-nav-config.test.ts
    parent-sidebar.test.tsx
  lib/
    checklists-tomorrow-key-moments.test.ts
    focus-eligibility.test.ts
    forecast-aggregation.test.ts
    openweathermap.test.ts
    templates-child-pin-admin.test.ts
    weather-service.test.ts
  meals-domain.test.ts
  month-strip.test.tsx
  ParentAlarmsManager.test.tsx
  ParentDashboard.test.tsx
  points-domain.test.ts
  revisions/
    api.test.ts
    validation.test.ts
  school-calendar.test.ts
  season-utils.test.ts
  timeline/
    day-timeline.test.tsx
    next-up-banner.test.tsx
    now-cursor.test.tsx
    timeline-task-card.test.tsx
  timeline-helpers.test.ts
  timers/
    circular-timer.test.tsx
    pomodoro-view.test.tsx
  time-utils.test.ts
  use-current-time.test.tsx
```

#### `docs`

```text
docs
  accessibility.md
  alarms-module.md
  animations-and-feedback.md
  architecture-overview.md
  backlog-phase2-priorise.md
  categories.md
  child-home.md
  child-home-logic.md
  child-home-redesign.md
  child-modules-redesign.md
  cinema-module.md
  day-templates-and-school-calendar.md
  day-templates-and-timeline.md
  design-system.md
  design-system-basics.md
  design-system-brief-v1.md
  existant-produit-ezra.md
  family-meals-and-emotions.md
  gamification-and-timers.md
  header-density.md
  header-design-gap.md
  instructions.md
  knowledge-and-achievements.md
  missions-instructions.md
  navigation-map-devices.md
  notifications.md
  page-specs-parent-enfant.md
  parent-dashboard.md
  parent-dashboard-and-modules.md
  parent-layout-and-nav.md
  product-ux-overview.md
  project-snapshot.md
  pwa-behavior.md
  revisions.md
  school-diary-and-checklists.md
  timeline-and-focus.md
  ui-system.md
  ui-time-calendar.md
  ux/
    ma-journee-ux-spec.md
    tomorrow-ux-spec.md
  ux-blueprint-premium.md
  weather.md
```

### 2.3 Purpose of each top folder (based on filenames/imports)

| Folder | Purpose (evidence-based) |
|---|---|
| `src/app` | Next App Router pages/layouts/loading/error + route handlers (`src/app/api/**`) |
| `src/components` | UI layer: child/parent screens, DS primitives (`src/components/ds/**`), motion, timeline, icons |
| `src/lib` | Data/domain/services: Supabase access, server actions, API aggregators, domain rules, hooks, demo fallback stores |
| `src/styles` | not found |
| `src/__tests__` | unit/integration tests (Vitest + Testing Library) |
| `docs` | product/UX/architecture specs and module docs |

## 3) "Ma journee" and "Timeline" implementation

### 3.1 Exact routes and file paths

| Screen | URL | Route file | Loading file | Proof |
|---|---|---|---|---|
| Ma journee (simplified/live view) | `/child/my-day` | `src/app/(child)/child/my-day/page.tsx` | `src/app/(child)/child/my-day/loading.tsx` | page renders `ChildDayViewLive` (`page.tsx:60-75`), loading renders `<ChildDayViewLive isLoading />` (`loading.tsx:1-4`) |
| Timeline view | `/child/my-day/timeline` | `src/app/(child)/child/my-day/timeline/page.tsx` | `src/app/(child)/child/my-day/timeline/loading.tsx` | page renders `ChildDayTimelineView` (`timeline/page.tsx:49-58`), loading renders `<ChildDayTimelineView isLoading />` (`timeline/loading.tsx:1-4`) |

Related navigation routes:
- From my-day simplified -> timeline: `router.push("/child/my-day/timeline")` at `src/components/child/my-day/child-day-view-live.tsx:449`.
- From timeline -> simplified: `router.push("/child/my-day")` at `src/components/child/my-day/child-day-timeline-view.tsx:433,456,616`.

### 3.2 String search results for requested labels

Search terms requested: `Ma journee`, `Timeline`, `Maintenant`, `Ensuite`, `Plus tard`, `Je continue`, `Voir ma journee`.

| Term | Found? | Paths |
|---|---|---|
| `Ma journee` | yes | `src/components/child/my-day/child-day-view-live.tsx:579`, onboarding copy at `src/components/onboarding/child-onboarding-overlay.tsx:32` |
| `Timeline` | yes | heading and section in `src/components/child/my-day/child-day-timeline-view.tsx:439,555` |
| `Maintenant` | yes | `src/components/child/my-day/active-task-card.tsx:64`; also timeline/home components |
| `Ensuite` | yes | `src/components/child/home/child-home-now-card.tsx:74,201`; legacy banner `src/components/timeline/next-up-banner.tsx` |
| `Plus tard` | yes | `src/components/child/my-day/child-day-view-live.tsx:231` |
| `Je continue` | not found | full-code search returned no match |
| `Voir ma journee` | yes | `src/components/child/home/child-home-now-card.tsx:271` |
### 3.3 Component inventory for these screens

#### A) Runtime component graph (`/child/my-day` and `/child/my-day/timeline`)

| Component | File | Client/Server | Key props (from types) | Used in |
|---|---|---|---|---|
| `ChildMyDayPage` | `src/app/(child)/child/my-day/page.tsx` | server route (no `use client`) | n/a | App Router page |
| `ChildMyDayTimelinePage` | `src/app/(child)/child/my-day/timeline/page.tsx` | server route | n/a | App Router page |
| `ChildDayViewLive` | `src/components/child/my-day/child-day-view-live.tsx` | client (`:1`) | `instances`, `templateBlocks`, `dayContext`, `rewardTiers`, `v2Enabled`, `timelineItems`, `currentActionItem`, `dayBalance` (`:42-56`) | imported in `src/app/(child)/child/my-day/page.tsx:1`, `src/app/(child)/child/my-day/loading.tsx:1` |
| `ChildDayTimelineView` | `src/components/child/my-day/child-day-timeline-view.tsx` | client (`:1`) | `instances`, `templateBlocks`, `dayContext`, `hasTemplate`, `v2Enabled`, `timelineItems`, `currentActionItem` (`:32-42`) | imported in `src/app/(child)/child/my-day/timeline/page.tsx:1`, `.../timeline/loading.tsx:1` |
| `ActiveTaskCard` | `src/components/child/my-day/active-task-card.tsx` | client (`:1`) | `task`, `isPaused`, `isPending`, `showFocusAction`, callbacks (`onComplete`, `onPauseToggle`, `onFocus`, `onOpenTimeline`) (`:9-18`) | imported in `src/components/child/my-day/child-day-view-live.tsx:10` |
| `FocusView` | `src/components/child/focus/focus-view.tsx` | client (`:1`) | `instance`, `presentation`, `isTaskPaused`, `onClose`, `onSessionComplete`, `calmPomodoroOnly` (`:18-24`) | imported in `child-day-view-live.tsx:11`, `child-day-timeline-view.tsx:12`, and standalone focus page |
| `ChildShell` | `src/components/layout/child-shell.tsx` | client (`:1`) | `children`, `checklistBadgeCount`, `childProfileId`, `childDisplayName` (`:17-22`) | imported in `src/app/(child)/layout.tsx:1` |
| `TabBar` (bottom nav) | `src/components/ds/tab-bar.tsx` | client (`:1`) | `items: TabBarItemConfig[]`, optional `className` (`:24-39`) | rendered in `src/components/layout/child-shell.tsx:159` |
| `ChildThemeLock` | `src/components/layout/child-theme-lock.tsx` | client (`:1`) | none | imported in `src/app/(child)/layout.tsx:2` |

#### B) Related but not currently wired to runtime my-day route chain

| Component/module | Path | Evidence |
|---|---|---|
| `ChildHomeNowCard` (contains `Voir ma journee` CTA) | `src/components/child/home/child-home-now-card.tsx` | exported in `src/components/child/home/index.ts:1`, but no runtime imports in app pages/components (`rg ChildHomeNowCard` only found tests + file + index) |
| Legacy timeline suite (`DayTimeline`, `TimelineTaskCard`, `NowCursor`, `NextUpBanner`) | `src/components/timeline/*` | imports found in stories/tests and within that suite; no import from `src/app/(child)/child/my-day/*` |
| `TimeGridTimeline` | `src/components/child/today/time-grid-timeline.tsx` | exported in `src/components/child/today/index.ts:2`, no runtime import found |

### 3.4 Required short excerpts (10-30 lines each)

#### A) Top-level route file (`/child/my-day`)

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
 75:     />
 76:   );
 77: }
```

Source: `src/app/(child)/child/my-day/page.tsx`

#### B) Hero/Now card component

```tsx
 58:         <div className="flex items-center justify-between gap-2">
 59:           <div className="flex items-center gap-2">
 60:             <span className="inline-flex size-9 items-center justify-center rounded-radius-pill border border-brand-primary/25 bg-brand-50 text-brand-primary">
 61:               <ClockIcon className="size-5" />
 62:             </span>
 63:             <h2 className="font-display text-[26px] font-extrabold tracking-[0.01em] text-text-primary">
 64:               Maintenant
 65:             </h2>
 66:           </div>
 67:           {isPaused ? <Badge variant="neutral">En pause</Badge> : null}
 68:         </div>
 69: 
 70:         <div className="space-y-1.5">
 71:           <p className="truncate text-xl font-bold leading-snug tracking-[0.01em] text-text-primary">{task.title}</p>
 72:           <p className="text-base font-medium leading-relaxed text-text-secondary">
 73:             {task.startTime} - {task.endTime} · {getDurationLabel(task)}
 74:           </p>
 75:           <p className="reading text-base leading-relaxed text-text-secondary">
 76:             Touchez cette carte pour voir la timeline detaillee.
 77:           </p>
 78:         </div>
 79: 
 80:         <div className={cn("grid grid-cols-1 gap-2.5", actionColumnsClass)} onClick={(event) => event.stopPropagation()}>
 81:           <Button
 82:             size="lg"
 83:             variant="primary"
```

Source: `src/components/child/my-day/active-task-card.tsx`
#### C) Timeline component

```tsx
551:           <Card className="rounded-[20px] border-border-default bg-bg-surface shadow-card">
552:             <CardContent className="space-y-3 p-5">
553:               <div className="flex items-center justify-between gap-2">
554:                 <h2 className="font-display text-2xl font-bold tracking-[0.01em] text-text-primary">
555:                   Timeline
556:                 </h2>
557:                 <Badge variant="neutral">{timeline.length} items</Badge>
558:               </div>
559: 
560:               <div className="relative pl-7" data-testid="timeline-vertical-list">
561:                 <span
562:                   aria-hidden="true"
563:                   className="absolute bottom-0 left-3 top-0 w-px bg-border-default"
564:                 />
565:                 <ul className="space-y-3">
566:                   {timeline.map((item) => {
567:                     const ItemIcon = getKindIcon(item);
568:                     const isNow = nowItem?.id === item.id;
569: 
570:                     return (
571:                       <li key={item.id} className="relative">
572:                         <span
573:                           aria-hidden="true"
574:                           className={cn(
575:                             "absolute -left-7 top-3 inline-flex size-6 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface text-text-secondary",
576:                             isNow ? "border-brand-primary/40 bg-brand-50 text-brand-primary" : "",
577:                           )}
578:                         >
579:                           <ItemIcon className="size-4" />
```

Source: `src/components/child/my-day/child-day-timeline-view.tsx`

#### D) Bottom navigation component usage

```tsx
 98:       {
 99:         href: "/child",
100:         label: "Aujourd'hui",
101:         shortLabel: "Auj.",
102:         icon: <TodayIcon active={false} />,
103:         activeIcon: <TodayIcon active />,
104:         matchPrefixes: ["/child"],
105:       },
106:       {
107:         href: "/child/checklists",
108:         label: "Demain",
109:         shortLabel: "Demain",
110:         icon: <TomorrowIcon active={false} />,
111:         activeIcon: <TomorrowIcon active />,
112:         badgeCount: checklistBadgeCount,
113:       },
114:       {
115:         href: "/child/achievements",
116:         label: "Recompenses",
117:         shortLabel: "Recomp.",
118:         icon: <RewardsIcon active={false} />,
119:         activeIcon: <RewardsIcon active />,
120:       },
121:       {
122:         href: "/child/tools",
123:         label: "Outils",
124:         shortLabel: "Outils",
125:         icon: <ToolsIcon active={false} />,
126:         activeIcon: <ToolsIcon active />,
127:         matchPrefixes: ["/child/tools", "/child/knowledge", "/child/my-day", "/child/focus"],
```

Source: `src/components/layout/child-shell.tsx`

## 4) Data/State Model Inventory (UI drivers)

### 4.1 Sources of truth and data flow

#### Primary persistent data (Supabase)

Tables and shape are defined in migrations and generated DB types:
- `task_categories` (`supabase/migrations/20260211100000_day_templates_timeline.sql:1`) / `src/types/database.ts:321`
- `day_templates` (`.../20260211100000...:10`) / `src/types/database.ts:6`
- `template_tasks` (`.../20260211100000...:19`) / `src/types/database.ts:1804`
- `day_template_blocks` (`supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:1`) / `src/types/database.ts:41`
- `task_instances` (`supabase/migrations/20260211130000_gamification_points_timers.sql:4`) / `src/types/database.ts:362`
- `reward_tiers` (`.../20260211130000...:20`) / `src/types/database.ts:1766`
- `daily_points` (`.../20260211130000...:30`) / `src/types/database.ts:445`

Task statuses and kind constraints:
- status check in SQL: `a_faire | en_cours | termine | en_retard | ignore` (`20260211130000...:10`)
- generated type: `src/types/database.ts:376`
- kind evolution migration: `supabase/migrations/20260219123000_plan_items_kind_v2.sql`

#### Server-side aggregation for my-day/timeline

- Route pages call `getTodayTemplateWithTasksForProfileV2`:
  - `src/app/(child)/child/my-day/page.tsx:57`
  - `src/app/(child)/child/my-day/timeline/page.tsx:44-46`
- Core aggregator: `src/lib/api/day-view.ts`
  - base load: `getTodayTemplateWithTasksForProfile` (`:309`)
  - V2 projection: `toTimelineV2Data` (`:282`) and `getTodayTemplateWithTasksForProfileV2` (`:628`)
  - Supabase queries use `.from(...)` on `profiles`, `task_instances`, `reward_tiers`, `day_template_blocks`, `school_periods`, `template_tasks`, `task_categories`, `daily_points`, `knowledge_cards` (`day-view.ts:257,272,426,464,472,479,486,531,534,560,580`)
- Ensuring daily instances from template: `src/lib/actions/ensure-today-instances.ts:20-84`

#### Client-side state and transitions

- `ChildDayViewLive` local state: task list, pending id, pause state, focus overlay (`src/components/child/my-day/child-day-view-live.tsx:296-301`)
- `ChildDayTimelineView` local state: task list, selected item, pending id, focus overlay (`.../child-day-timeline-view.tsx:236-239`)
- Task transition action: `updateTaskStatusAction` (`src/lib/actions/tasks.ts:36`), with transition validation + points logic + `task_instances` and `daily_points` update.
#### Fallback mode (non-Supabase)

- Gated by env helper `isSupabaseEnabled()` (`src/lib/supabase/env.ts:17-18`)
- Fallback stores:
  - templates/blocks/categories: `src/lib/demo/day-templates-store.ts`
  - task instances/daily points/reward tiers: `src/lib/demo/gamification-store.ts`
- Persistence in `.tmp/*.json` in non-test runtime: store constants in both demo store files.

### 4.2 Required type inventory (timeline/tasks/rewards)

| Type | Path |
|---|---|
| `TaskInstanceSummary` | `src/lib/day-templates/types.ts:121` |
| `DayTimelineItemSummary` | `src/lib/day-templates/types.ts:188` |
| `TodayTimelineData` | `src/lib/day-templates/types.ts:178` |
| `TodayTimelineV2Data` | `src/lib/day-templates/types.ts:240` |
| `RewardTierSummary` | `src/lib/day-templates/types.ts:156` |
| `DailyPointsSummary` | `src/lib/day-templates/types.ts:165` |
| `DayBalanceSummary` | `src/lib/day-templates/types.ts:220` |

### 4.3 Rewards/points/progress computation locations

- Per-task transition points: `computePointsForTransition` (`src/lib/domain/points.ts:9-22`)
- Status transition rules: `canTransitionTaskStatus` (`src/lib/domain/task-status.ts:11-30`)
- Daily points update in action: `src/lib/actions/tasks.ts` (reads/writes `daily_points` + updates `task_instances`)
- Day-balance summary from timeline items: `computeDayBalanceFromTimelineItems` (`src/lib/day-templates/balance.ts:70`)
- Next reward target logic in UI: `computePointsTarget` inside `ChildDayViewLive` (`src/components/child/my-day/child-day-view-live.tsx:118-130`)

`stars` as separate persisted currency was not found; point model is based on `points_base`, `points_earned`, and `daily_points.points_total`.

## 5) Design System Inventory

### 5.1 DS implementation model

Not using an external UI kit like shadcn package; this repo has a custom DS layer in `src/components/ds/*`, with CVA variants and Tailwind.

Evidence:
- DS exports: `src/components/ds/index.ts`
- variants with `class-variance-authority`: `src/components/ds/button.tsx:4-35`, `src/components/ds/badge.tsx:2-26`

### 5.2 Token sources (exact files)

| Token source | Path | Evidence |
|---|---|---|
| CSS variables (colors, radius, shadows, space, typography vars) | `src/app/globals.css` | root token blocks from `:31+` and dark overrides from `:140+` |
| Tailwind semantic token mapping | `tailwind.config.ts` | extended `colors`, `spacing`, `borderRadius`, `boxShadow`, `fontFamily`, `backgroundImage` (`:25,100,109,117,123,128`) |

### 5.3 Typography and fonts

- Fonts loaded via Next font API in root layout:
  - `Lexend` as UI font variable `--font-lexend`
  - `Atkinson_Hyperlegible` as reading font variable `--font-atkinson`
- Evidence: `src/app/layout.tsx:2,9-18`
- Tailwind mapping to families: `tailwind.config.ts:123-127`
- `.reading` utility uses reading font: `src/app/globals.css` (class declaration)

### 5.4 Icon system

- External icon package usage not found (`lucide`, `heroicons`, `react-icons` search returned none).
- Custom icon set in `src/components/child/icons/child-premium-icons.tsx`.
- Category icon resolver maps domain keys to custom icons in `src/components/ds/category-icons.tsx:22-50`.

### 5.5 Core DS components used by target screens

| UI concern | Component(s) | Path |
|---|---|---|
| Buttons | `Button` | `src/components/ds/button.tsx` |
| Cards | `Card`, `CardContent` | `src/components/ds/card.tsx` |
| Badges | `Badge` | `src/components/ds/badge.tsx` |
| Modal | `Modal` | `src/components/ds/modal.tsx` |
| Skeleton | `Skeleton` | `src/components/ds/skeleton.tsx` |
| Bottom navigation | `TabBar` | `src/components/ds/tab-bar.tsx` |
| Category icons | `CategoryIcon`, `resolveCategoryIcon` | `src/components/ds/category-icons.tsx` |

### 5.6 Existing styling conventions observed

- Touch target sizes in Tailwind spacing extension: `touch-sm/md/lg` (`tailwind.config.ts:100-104`)
- Button variants (`primary`, `secondary`, `tertiary`, `ghost`, `danger`, `link`) in `button.tsx:12-21`
- Radius naming (`radius-card`, `radius-pill`, `radius-button`) in `tailwind.config.ts:109-114`
- Semantic color tokens consumed as `bg-*`, `text-*`, `status-*`, `category-*`.

## 6) Testing and Quality Gates Inventory

### 6.1 Frameworks and config

| Type | Tool | Config |
|---|---|---|
| Unit/component tests | Vitest + Testing Library | `vitest.config.ts`, `vitest.setup.ts` |
| E2E tests | Playwright | `playwright.config.ts` |
| Storybook visual/dev | Storybook 8 + Vite | `.storybook/main.ts`, `.storybook/preview.tsx` |
| Lint | ESLint | `eslint.config.mjs` |
| Format | Prettier | `.prettierrc.json` |
| Typecheck | TypeScript compiler | `tsconfig.json` + `npm run typecheck` |

CI workflows:
- `.github/workflows` not found.

### 6.2 Existing tests related to Ma journee / Timeline

Runtime my-day/timeline tests:
- `src/__tests__/child/my-day/child-day-view-live.test.tsx`
- `src/__tests__/child/my-day/child-day-timeline-view.test.tsx`
- `src/__tests__/child/my-day/focus-view-overlay.test.tsx`

Legacy timeline suite tests:
- `src/__tests__/timeline/day-timeline.test.tsx`
- `src/__tests__/timeline/next-up-banner.test.tsx`
- `src/__tests__/timeline/now-cursor.test.tsx`
- `src/__tests__/timeline/timeline-task-card.test.tsx`
- `src/__tests__/timeline-helpers.test.ts`

E2E:
- `e2e/child-my-day.spec.ts`
- `e2e/child-home.spec.ts`

### 6.3 Commands to run locally

- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`

Tests were not executed during this snapshot (per request).

## 7) Known Constraints, Risks, and Legacy/Duplicate Areas (evidence-based)

### 7.1 Tight coupling areas

1. `my-day` pages are tightly coupled to one aggregator payload shape.
   Evidence:
   - `src/app/(child)/child/my-day/page.tsx` and `src/app/(child)/child/my-day/timeline/page.tsx` both consume `getTodayTemplateWithTasksForProfileV2(...)`.
   - Both route files pass many strongly-shaped props directly into UI components.
   - Contract types are centralized in `src/lib/day-templates/types.ts` (`TodayTimelineV2Data`, `DayTimelineItemSummary`, `DayBalanceSummary`).

2. UI behavior depends on feature-flag branching in multiple layers.
   Evidence:
   - Flag source: `src/config/feature-flags.ts:11`.
   - Branches in API layer: `src/lib/api/day-view.ts:300`.
   - Branches in both screen components: `src/components/child/my-day/child-day-view-live.tsx:332-348`, `src/components/child/my-day/child-day-timeline-view.tsx:250-258`.

3. Task lifecycle is coupled across SQL, generated DB types, domain rules, and server action writes.
   Evidence:
   - SQL status check: `supabase/migrations/20260211130000_gamification_points_timers.sql`.
   - Generated status union: `src/types/database.ts` (`task_instances.status`).
   - Transition gate: `src/lib/domain/task-status.ts`.
   - Writes and points updates: `src/lib/actions/tasks.ts` (`task_instances` + `daily_points`).

4. Navigation behavior depends on hardcoded path strings in multiple components.
   Evidence:
   - Programmatic route transitions: `src/components/child/my-day/child-day-view-live.tsx:449`, `src/components/child/my-day/child-day-timeline-view.tsx:433,456,616`.
   - Bottom nav matching is path-prefix based: `src/components/layout/child-shell.tsx` (`matchPrefixes` includes `/child/my-day` and `/child/focus`).

### 7.2 Refactor pitfalls for Ma journee / Timeline

1. Changing payload fields from `getTodayTemplateWithTasksForProfileV2` risks breakage in both screens at once.
2. Removing or renaming `v2Enabled` logic requires synchronized edits in API + both screen components.
3. Route changes (`/child/my-day`, `/child/my-day/timeline`) require updates in push calls and in `ChildShell` tab matching.
4. Status or points rule changes require coordinated migration/type/domain/action updates to avoid runtime mismatch.
5. Demo fallback path (`src/lib/demo/*`) can diverge from Supabase path and cause environment-specific behavior differences.

### 7.3 Likely legacy or duplicate implementations (target domain)

The following paths appear as duplicates or legacy candidates relative to the current runtime my-day/timeline route chain:

- `src/components/timeline/*`
  - Legacy timeline suite (`day-timeline`, `timeline-task-card`, `now-cursor`, `next-up-banner`) appears in stories/tests but is not imported by `src/app/(child)/child/my-day/*`.
- `src/components/child/home/child-home-now-card.tsx`
  - Contains timeline-related CTA/copy (`Voir ma journee`) but is not imported by current runtime page/component chain (`src/app/(child)/child/page.tsx` -> `src/components/child/child-home-live.tsx`).
- `src/components/child/today/time-grid-timeline.tsx`
  - Exported via `src/components/child/today/index.ts` but no runtime imports were found under current app routes.

## 8) Read-only Command Log (executed for this snapshot)

Commands below are safe read-only inspection commands used during this snapshot/update pass. Results are summarized exactly at a high level.

1. `Get-Item docs/project-snapshot.md | Select-Object FullName,Length,LastWriteTime; git status --short`
   Result:
   - Confirmed report file exists with path/size/timestamp.
   - Confirmed workspace is already dirty with many pre-existing changes.

2. `Get-Content -Path docs/project-snapshot.md -TotalCount 300`
   Result:
   - Confirmed sections 1-6 content is present.

3. `rg -n "^## " docs/project-snapshot.md`
   Result:
   - Confirmed only sections 1-6 existed before this completion pass.

4. `rg -n "^### " docs/project-snapshot.md`
   Result:
   - Confirmed detailed subsection coverage and identified missing section 7+.

5. `Get-Content docs/project-snapshot.md -Tail 140`
   Result:
   - Confirmed file ended at section 6.3 before completion.

6. `rg -n "DAY_PLAN_V2|NEXT_PUBLIC_DAY_PLAN_V2|v2Enabled" src/config src/app src/components src/lib`
   Result:
   - Found flag source and branching usage across API/routes/components.

7. `rg -n "/child/my-day" src/components/child/my-day`
   Result:
   - Found route transition push calls between simplified and timeline views.

8. `rg -n "task_instances|daily_points|reward_tiers|template_tasks|day_template_blocks" src/lib/api/day-view.ts src/lib/actions/tasks.ts`
   Result:
   - Confirmed DB table write/read touchpoints for timeline and points data.

9. `rg -n '@/components/timeline|components/timeline' src`
   Result:
   - Confirmed legacy timeline suite is referenced in tests/stories and internal suite files.

10. `rg -n "ChildHomeNowCard" src`
    Result:
    - Confirmed usage in tests + barrel export; no runtime app-route imports found.

11. `rg -n "TimeGridTimeline" src`
    Result:
    - Confirmed component file + export only.

12. `Get-Content 'src/app/(child)/child/page.tsx' -TotalCount 220`
    Result:
    - Confirmed child home route uses `ChildHomeLive`.

13. `Get-Content 'src/components/child/child-home-live.tsx' -TotalCount 260`
    Result:
    - Confirmed home screen composition and absence of direct `ChildHomeNowCard` usage.

14. `Get-Content 'src/components/layout/child-shell.tsx' -TotalCount 260`
    Result:
    - Confirmed bottom tab configuration and path-prefix coupling.

15. `Get-ChildItem 'src/app/(child)/child/my-day/timeline' | Select-Object Name`
    Result:
    - Confirmed `loading.tsx` and `page.tsx` exist.

16. `Get-Content 'src/app/(child)/child/my-day/timeline/loading.tsx' -TotalCount 40`
    Result:
    - Confirmed loading route renders `<ChildDayTimelineView isLoading />`.

17. `Get-Content 'src/app/(child)/child/my-day/timeline/page.tsx' -TotalCount 140`
    Result:
    - Confirmed route payload wiring and component props for timeline view.

