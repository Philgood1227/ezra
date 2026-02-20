# Parent Layout and Navigation

## Overview

Le shell parent a ete refondu pour offrir une interface claire, calme et efficace sur laptop/tablette, visuellement distincte de l'espace enfant.

Objectifs:

- une navigation courte et lisible (3 sections)
- des signaux rapides (badges de pending)
- une structure responsive robuste (desktop, tablette, mobile)
- un comportement coherent en mode clair/sombre

Ce shell est maintenant la base de tous les ecrans parent, y compris le dashboard KPI et les modules de configuration premium documentes dans `docs/parent-dashboard-and-modules.md`.

References complementaires:

- `docs/product-ux-overview.md`
- `docs/animations-and-feedback.md`
- `docs/accessibility.md`
- `docs/pwa-behavior.md`

## Navigation IA

Source unique de verite: `src/config/parent-nav.tsx`.

Sections:

1. Tableau de bord
   - Tableau de bord (`/parent/dashboard`)
   - Notifications (`/parent/notifications`)
   - Alarmes (`/parent/alarms`)
2. Organisation
   - Journees types (`/parent/day-templates`)
   - Categories (`/parent/categories`)
   - Carnet scolaire (`/parent/school-diary`)
   - Checklists (`/parent/checklists`)
   - Repas (`/parent/meals`)
   - Connaissances (`/parent/knowledge`)
3. Vie familiale & Motivation
   - Succes & badges (`/parent/achievements`)
   - Recompenses (`/parent/rewards`)
   - Gamification (`/parent/gamification`)
   - Cinema (`/parent/cinema`)
   - Emotions (`/parent/dashboard#emotions`)

Footer:

- Parametres (`/parent/settings`)
- Deconnexion

## ParentShell

Composants:

- `src/components/layout/parent-shell.tsx`
- `src/components/layout/parent-sidebar.tsx`
- `src/components/layout/parent-header.tsx`

Comportements:

- Desktop (`>=1024px`): sidebar persistante (260px), repliable (80px)
- Tablette (`>=768px`): sidebar repliable, header sticky
- Mobile (`<768px`): sidebar en drawer off-canvas avec overlay

Le shell applique:

- `bg-bg-base` pour la surface principale
- classes semantiques DS pour texte/bordures/etats actifs
- `PageTransition` sur la zone de contenu
- lien "Aller au contenu principal" pour navigation clavier

## Header and breadcrumb

Header parent:

- titre de page derive du pathname
- fil d'ariane dynamique
- actions rapides (`Voir comme l'enfant`)
- `ThemeToggle`
- avatar parent + deconnexion

Mapping breadcrumb: `src/lib/navigation/parent-breadcrumb.ts`.

## Badges pending

Les badges de navigation sont consolides via:

- `src/lib/api/parent-nav.ts` (`getParentNavBadges`)
- `src/lib/hooks/useParentNavBadges.ts`
- `src/app/api/parent/nav-badges/route.ts`

Cles de badge:

- `notifications`
- `schoolDiary`
- `checklists`
- `alarms`

## Add a new parent route

1. Ajouter la route dans `src/app/(parent)/parent/...`.
2. Ajouter une entree dans `parentNavSections` (ou footer).
3. Ajouter le mapping breadcrumb dans `getParentBreadcrumb`.
4. Verifier l'etat actif (`href`/`matchPrefixes`) et les badges si necessaire.
5. Ajouter/adapter les tests layout + e2e si la navigation change.

## Dashboard and modules integration

Le shell accueille des contenus parent harmonises avec la meme grammaire visuelle:

1. `dashboard`: widgets KPI + charts legers + actions rapides
2. `organisation`: formulaires colonne unique avec validation inline
3. `vie familiale`: succes, recompenses et regles motivation

Reference implementation:

1. `src/features/dashboard/components/parent-dashboard-view.tsx`
2. `src/features/day-templates/components/*`
3. `src/features/school-diary/components/*`
4. `src/features/meals/components/parent-meals-manager.tsx`
5. `src/features/achievements/components/parent-achievements-manager.tsx`

## Accessibility

- focus visible sur tous les controles interactifs
- navigation clavier complete (liens, boutons, drawer)
- labels ARIA explicites (sidebar, breadcrumb, actions)
- support mode sombre via tokens semantiques
- texte UI parent en francais
- skip link global vers le contenu principal
- onboarding parent clavier-friendly (fleches, tab, fermeture explicite)

