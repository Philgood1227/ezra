# Ezra Architecture Overview

## Overview

Ezra is a Next.js App Router application with strict TypeScript and a layered architecture:

- `src/app`: route composition for auth, parent, and child spaces.
- `src/components/ds`: shared design-system primitives.
- `src/components/time`, `src/components/calendar`: child home orientation UI.
- `src/components/timeline`: child "Ma journee" timeline and points feedback.
- `src/components/timers`: focus timers (`CircularTimer`, `PomodoroView`).
- `src/components/child/home`: child home widgets (hero, now/next, progress, checklist summary, compact calendar).
- `src/components/child/checklists`: redesigned checklist cards and animated item rows.
- `src/components/child/knowledge`: redesigned discoveries flow (subjects, tiles, detail).
- `src/components/child/achievements`: redesigned badges and unlock celebration.
- `src/components/child/cinema`: redesigned movie session and poster cards.
- `src/components/child/emotions`: redesigned mood check-ins and weekly strip.
- `src/components/child/meals`: redesigned meals rating and favorites strip.
- `src/components/layout`: app shells (`AuthShell`, `ChildShell`, `ParentShell`) and navigation components.
- `src/components/notifications`: reusable in-app notification UI.
- `src/features/day-templates`: parent back-office for categories, day templates, rewards.
- `src/features/knowledge`: parent knowledge subject/category/card management.
- `src/features/achievements`: parent achievements and badge configuration.
- `src/features/cinema`: parent movie night planning and voting setup.
- `src/features/meals`: parent meal journal, ingredient catalog, recipes, and weekly ingredient aggregation.
- `src/features/dashboard`: parent weekly aggregation widgets.
- `src/features/alarms`: parent alarm scheduling and child fullscreen alarm center.
- `src/features/school-diary`: parent UI for school diary, checklist templates, and reminders.
- `src/lib/api`: read-side data loaders.
- `src/lib/actions`: write-side server actions (tasks, knowledge, achievements, cinema, meals, emotions).
- `src/lib/domain`: pure business helpers (status, points, knowledge, achievements, cinema, dashboard, meals, emotions).
- `src/lib/supabase`: browser/server/admin Supabase clients.
- `supabase/migrations`: SQL schema and RLS policies.

Platform stack:

- Next.js 15 App Router + React 19
- Supabase Auth + PostgreSQL (RLS)
- Tailwind + custom DS
- Vitest + Testing Library + Playwright
- Storybook 8
- PWA with `@ducanh2912/next-pwa`

Related UI documentation:

- `docs/design-system.md`: premium semantic token system, dark mode, motion primitives, DS catalogue.
- `docs/child-home-redesign.md`: architecture d'accueil enfant (navigation 4+1 et widgets).
- `docs/child-home.md`: structure finale Home enfant Option A (priorites, blocs, regles Now/Next).
- `docs/timeline-and-focus.md`: architecture timeline premium + mode focus.
- `docs/child-modules-redesign.md`: redesign premium des modules secondaires enfant.
- `docs/parent-layout-and-nav.md`: shell parent premium, IA navigation et comportements responsives.
- `docs/parent-dashboard-and-modules.md`: dashboard parent KPI-first et modules de configuration premium.
- `docs/product-ux-overview.md`: vision UX globale, onboarding et personnalisation.
- `docs/animations-and-feedback.md`: usage motion, haptique, sons et garde offline.
- `docs/accessibility.md`: patterns WCAG/COGA et checks de base.
- `docs/pwa-behavior.md`: comportement PWA tablette/mobile, safe areas et mode hors-ligne.
- `docs/day-templates-and-school-calendar.md`: separation plages structurelles vs taches, calendrier scolaire, impacts parent/enfant.
- `docs/child-home-logic.md`: logique des chips periode/vacances et carte reperes (Matin/Apres-midi/Soir).

## Data Model

Core:

- `families`
- `profiles` (`parent`, `child`, `viewer`)

Scheduling and gamification:

- `task_categories`
- `day_templates`
- `day_template_blocks`
- `template_tasks`
- `task_instances`
- `daily_points`
- `reward_tiers`
- `school_periods`

School diary and preparation:

- `school_diary_entries`
- `checklist_templates`
- `checklist_items`
- `checklist_instances`
- `checklist_instance_items`

Knowledge base:

- `knowledge_subjects`
- `knowledge_categories`
- `knowledge_cards`
- `knowledge_favorites`

Achievements:

- `achievement_categories`
- `achievements`
- `achievement_instances`

Cinema:

- `movie_sessions`
- `movie_options`
- `movie_votes`

Meals and emotion logs:

- `meals`
- `meal_ratings`
- `ingredients`
- `recipes`
- `recipe_ingredients`
- `meal_ingredients`
- `emotion_logs`

Notifications:

- `notification_rules`
- `in_app_notifications`
- `push_subscriptions`

Alarms:

- `alarm_rules`
- `alarm_events`

## RLS and Access Model

All domain tables are RLS-enabled and scoped by `family_id`.

- Parent:
  - full CRUD on school diary entries, checklist templates/items, notification rules
  - full CRUD on alarm rules
  - full CRUD on knowledge subjects/categories/cards
  - configure achievements auto-trigger availability
  - full CRUD on cinema sessions/options
  - full CRUD on meals, ingredients, recipes, meal ingredients, and recipe ingredients
  - read child emotion logs
  - read weekly dashboard indicators
  - full read access on family checklists and notifications
- Child:
  - read school/checklist data for own profile
  - update own checklist item completion (`is_checked`)
  - read knowledge cards and toggle own favorites
  - read achievements and unlocked badge states
  - vote on cinema sessions according to family scope
  - create/update own emotion logs (`matin`, `soir`)
  - read and mark own in-app notifications as read
  - receive and acknowledge own alarm events

Server actions re-check role and family scope before writes.

## Workflows

### Parent workflow

1. Define checklist templates in `/parent/checklists` (e.g. piscine, sortie).
2. Add diary entries in `/parent/school-diary`.
3. On save, Ezra generates/updates checklist instances for the child and target date.
4. Manage fiches d'aide in `/parent/knowledge` (subjects, categories, cards).
5. Optionally link fiches to homework tasks in day templates.
6. Configure badges in `/parent/achievements` (enable/disable seeded auto badges).
7. Configure movie sessions in `/parent/cinema` (date/time, picker/proposer, 3 options).
8. Configure reminder rules in `/parent/notifications`.
9. Configure alarms in `/parent/alarms` (one-shot or recurring, with sound and message).
10. Log meals in `/parent/meals`, enrich with ingredients, and optionally save reusable recipes.
11. Review weekly ingredient needs and weekly indicators in `/parent/dashboard` (tasks, points, emotions, meals, load).
12. Configure school periods (`vacances`, `jour_special`) and structural blocks in `/parent/day-templates`.

### Child workflow

1. Open `/child/my-day` to view timeline and points.
2. Open `/child/focus/[instanceId]` to run a timer mission on one task.
3. Open `/child/knowledge` ("Decouvertes") and consult fiches by subject/category/favorites.
4. Open `/child/checklists`.
5. Tick checklist items for today and tomorrow.
6. Validate tasks, gain points, and unlock badges in `/child/achievements`.
7. Vote for upcoming movie night in `/child/cinema`.
8. See chosen movie integrated in "Ma journee" as an evening block.
9. When an alarm is due, acknowledge it from the fullscreen child modal.
10. Record morning/evening mood in `/child/emotions`.
11. Rate meals and revisit favorites in `/child/meals`.

## UI Behaviour

- All parent/child UI labels are in French.
- Shared DS styling is token-driven (`bg.*`, `text.*`, `status.*`, etc.) with automatic light/dark adaptation.
- Checklist interactions are simple and touch-friendly (large checkboxes, short labels).
- Knowledge cards use structured short sections ("Rappel", "Exemple", "Astuce").
- Achievements show locked/unlocked visual states and overall progress.
- Cinema cards are simple and explicit (3 options, clear vote state).
- Child emotions page uses 5 emoji states for matin/soir check-in and a weekly strip.
- Child meals page uses 3-level smiley ratings and a favorites carousel.
- Parent dashboard summarizes the week in compact cards (completion, points, mood, favorites, load).
- In-app notifications are surfaced in a compact notification center.
- Child tab bar can show unread reminder count.
- Alarms are rendered in a fullscreen child modal with audible cues.
- First-run onboarding is role-based (parent modal, child fullscreen overlay) and profile-scoped.
- Network state is surfaced globally (offline banner + reconnect toast).
- Haptic and sound feedback are configurable from preferences/settings.

## Limitations

- No external school system integration.
- No spaced repetition algorithm for knowledge cards in this phase.
- No social leaderboard or public badge sharing.
- No film recommendation engine; parents input options manually.
- No nutrition analytics (macros/calories) in meal tracking.
- Emotion tracking is intentionally simple and not a clinical tool.
- Push subscriptions are stored, but production push dispatch requires VAPID/private-key setup and a scheduler.
- Alarm trigger in MVP A depends on child-side polling while the app is open.

## Future Work

- Automated scheduled reminder jobs (cron/edge jobs).
- Advanced push dispatch reliability and delivery logs.
- Richer checklist-to-task linking with optional point bonuses.
- Weekly school, badges, and focus summaries for parents.
- Optional richer cinema fairness modes (still transparent and family-readable).
- Alarm scheduler/cron migration (MVP B) for reliable background triggering.
- Multi-child dashboard switching and family-level comparisons.
- Optional meal planning assistance and soft recommendations from favorites.

## Child home layout (tablet-first)

Le flux `Accueil` enfant (`/child`) a ete simplifie pour reduire la charge cognitive:

1. Hero contextuel (salutation + date)
2. Horloge compacte (digitale + analogique)
3. Carte `Maintenant / Ensuite`
4. Progression du jour
5. Resume checklists + calendrier compact (2 colonnes sur tablette, pile sur mobile)

Composants principaux:

1. `src/components/child/child-home-live.tsx`
2. `src/components/child/home/greeting-hero.tsx`
3. `src/components/child/home/clock-widget.tsx`
4. `src/components/child/home/now-next-card.tsx`
5. `src/components/child/home/daily-progress-widget.tsx`
6. `src/components/child/home/checklist-summary-widget.tsx`
7. `src/components/child/home/calendar-strip-widget.tsx`

Chargement de donnees consolide:

1. `src/lib/api/child-home.ts`
2. API: `getChildHomeData(profileId)`
3. Le loader agrege taches courantes/suivantes, progression points, resume checklists et nom enfant.

Navigation enfant:

1. Tab bar 4+1 (`Accueil`, `Ma journee`, `Checklists`, `Decouvertes`, `Plus`)
2. Menu `Plus` en bottom sheet (`Succes`, `Cinema`, `Emotions`, `Repas`)
3. Badge checklists non cochees injecte depuis `src/app/(child)/layout.tsx`

## Child secondary modules redesign

Les modules secondaires enfant suivent maintenant le meme langage premium (cards glassmorphism, PageTransition, ListStagger, Skeleton, EmptyState, haptique):

1. `src/app/(child)/child/checklists`
2. `src/app/(child)/child/knowledge`
3. `src/app/(child)/child/achievements`
4. `src/app/(child)/child/cinema`
5. `src/app/(child)/child/emotions`
6. `src/app/(child)/child/meals` (sans redirection)

Chaque page s'appuie sur les composants de `src/components/child/*` correspondants et conserve les loaders/API existants (`src/lib/api/*`, `src/lib/actions/*`) sans modification de schema.

## Parent shell and navigation

Toutes les routes `/parent/*` sont rendues via un shell unique:

1. `src/app/(parent)/layout.tsx`
2. `src/components/layout/parent-shell.tsx`
3. `src/components/layout/parent-sidebar.tsx`
4. `src/components/layout/parent-header.tsx`

Information architecture parent (source unique):

1. `src/config/parent-nav.tsx`
2. 3 sections: `Tableau de bord`, `Organisation`, `Vie familiale & Motivation`
3. Footer: `Parametres` + `Deconnexion`

Badges de pending centralises:

1. `src/lib/api/parent-nav.ts`
2. `src/lib/hooks/useParentNavBadges.ts`
3. API: `src/app/api/parent/nav-badges/route.ts`

Breadcrumb dynamique:

1. `src/lib/navigation/parent-breadcrumb.ts`
2. titre de page derive du dernier segment du fil d'ariane

Responsive behavior:

1. Desktop: sidebar persistante et repliable
2. Tablette: navigation compacte (icons + labels)
3. Mobile: drawer lateral via bouton hamburger

## Parent dashboard and configuration modules

Le parent dispose maintenant d'un cockpit KPI + widgets et de modules de configuration harmonises:

1. dashboard: `src/features/dashboard/components/parent-dashboard-view.tsx`
2. journees types/categories: `src/features/day-templates/components/*`
3. carnet/checklists: `src/features/school-diary/components/*`
4. repas: `src/features/meals/components/parent-meals-manager.tsx`
5. succes/recompenses: `src/features/achievements/components/parent-achievements-manager.tsx`, `src/features/day-templates/components/rewards-manager.tsx`

Details UX et patterns: `docs/parent-dashboard-and-modules.md`.

## Day templates and school calendar model

La planification quotidienne est maintenant separee en deux couches:

1. `day_template_blocks`:
   - plages structurelles non cochables (`school`, `daycare`, `free_time`, `other`)
   - sert de contexte temporel pour la journee enfant
2. `template_tasks` + `task_instances`:
   - taches/actionnables cochables
   - base du suivi progression/points

Calendrier scolaire famille:

1. `school_periods` (`vacances`, `jour_special`)
2. derive la periode du jour: `ecole`, `vacances`, `weekend`, `jour_special`
3. alimente les widgets enfant:
   - chip `Periode`
   - chip `Prochaines vacances`
   - contexte `En ce moment` sur l'accueil et la timeline

Composants/loader clefs:

1. `src/lib/day-templates/school-calendar.ts`
2. `src/lib/api/templates.ts`
3. `src/lib/api/day-view.ts`
4. `src/lib/api/child-home.ts`
5. `src/features/day-templates/components/school-calendar-manager.tsx`
6. `src/components/timeline/day-timeline.tsx`

