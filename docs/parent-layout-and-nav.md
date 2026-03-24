# Parent Layout and Navigation

## Overview

Le shell parent a ete refondu pour offrir une interface claire, calme et efficace sur laptop/tablette, visuellement distincte de l'espace enfant.

Objectifs:

- une navigation courte et lisible (sections principales + hubs)
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

1. Essentiel
   - Tableau de bord (`/parent/dashboard`)
   - Notifications (`/parent/notifications`)
   - Alarmes (`/parent/alarms`)
2. Organisation
   - Modules organisation (`/parent/organization`)
   : hub vers Journees types, Carnet scolaire, Checklists, Categories.
3. Apprentissages
   - Modules apprentissages (`/parent/learning`)
   : hub vers Bibliotheque, Generer (IA), Livres & fiches, Connaissances.
4. Vie quotidienne
   - Repas (`/parent/meals`)
5. Vie familiale & motivation
   - Modules famille (`/parent/family`)
   : hub vers Succes & badges, Recompenses, Gamification, Cinema.

Footer:

- Parametres (`/parent/settings`)
- Deconnexion

## Navigation contextuelle par module

Source dediee: `src/lib/navigation/parent-module-nav.ts`.

Ce mapping ajoute une navigation horizontale sous le header (`ParentModuleSubnav`) selon le module actif:

1. Essentiel: dashboard, notifications, alarmes
2. Organisation: organisation, journees types, carnet scolaire, checklists, categories
3. Apprentissages: hub + bibliotheque + generer (IA) + livres & fiches + connaissances
4. Vie familiale: modules famille, repas, succes, recompenses

Regles:

1. la barre est contextuelle (cachee si aucune section ne correspond au pathname)
2. les boutons actifs reutilisent `matchPrefixes` / `href` pour couvrir les sous-routes
3. le style reste coherent DS (`premium` actif, `glass` inactif)

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

Le shell integre aussi un drawer global d'actions rapides:

- composant: `src/components/layout/parent-quick-actions-drawer.tsx`
- ouverture via bouton "Actions rapides" dans le header
- fermeture via overlay, bouton fermer ou touche Escape
- contenu: raccourcis par module (meme source `parent-module-nav.ts`)

## Header and breadcrumb

Header parent:

- titre de page derive du pathname
- fil d'ariane dynamique
- actions rapides (`Voir comme l'enfant`)
- bouton "Actions rapides" (ouvre le drawer de raccourcis)
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

