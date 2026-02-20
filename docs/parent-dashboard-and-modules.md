# Parent Dashboard and Modules

## Vue d'ensemble

Le parent dispose maintenant d'une experience premium orientee pilotage:

1. lecture rapide des indicateurs semaine
2. actions rapides pour corriger la configuration
3. formulaires lisibles avec validation inline
4. structure visuelle coherente (cards glassmorphism, tokens semantiques, mode sombre)

## Dashboard parent

Route: `/parent/dashboard`

Composants principaux:

1. `src/features/dashboard/components/parent-dashboard-view.tsx`
2. `src/components/parent/dashboard/kpi-card.tsx`
3. `src/components/parent/dashboard/weekly-tasks-widget.tsx`
4. `src/components/parent/dashboard/weekly-points-widget.tsx`
5. `src/components/parent/dashboard/emotions-widget.tsx`
6. `src/components/parent/dashboard/today-load-widget.tsx`
7. `src/components/parent/dashboard/meals-widget.tsx`
8. `src/components/parent/dashboard/school-diary-widget.tsx`
9. `src/components/parent/dashboard/parent-dashboard-skeleton.tsx`

Organisation:

1. Haut: cartes KPI (taches, points, humeur, charge)
2. Milieu: widgets hebdomadaires (taches + points)
3. Bas: humeur, charge du jour, repas, carnet, actions rapides

Principes UX:

1. KPI-first: chiffres prioritaires et lisibles
2. comparaison hebdo compacte (7 jours)
3. sections actionnables sans surcharge
4. transitions douces, sans motion excessive

## Modules de configuration parent

### Journees types et categories

Routes:

1. `/parent/day-templates`
2. `/parent/day-templates/[id]`
3. `/parent/categories`

Composants:

1. `src/features/day-templates/components/template-editor.tsx`
2. `src/features/day-templates/components/categories-manager.tsx`

Patterns:

1. semaine visible en cartes lisibles
2. edition par bloc de tache avec panneau details
3. validation inline des champs requis (nom, titre, duree)

### Carnet scolaire et checklists

Routes:

1. `/parent/school-diary`
2. `/parent/checklists`

Composants:

1. `src/features/school-diary/components/school-diary-manager.tsx`
2. `src/features/school-diary/components/checklist-templates-manager.tsx`

Patterns:

1. formulaire en colonne unique
2. validation inline sur blur + etats valides
3. listes en cartes avec actions explicites

### Repas

Route: `/parent/meals`

Composant:

1. `src/features/meals/components/parent-meals-manager.tsx`

Patterns:

1. resume de semaine en tete
2. planification par jour
3. edition repas + ingredients sans surcharge visuelle

### Succes et recompenses

Routes:

1. `/parent/achievements`
2. `/parent/rewards`

Composants:

1. `src/features/achievements/components/parent-achievements-manager.tsx`
2. `src/features/day-templates/components/rewards-manager.tsx`

Patterns:

1. definitions de succes en cartes
2. toggles clairs pour auto-trigger
3. paliers de recompense ordonnes et editables

## Pattern de validation de formulaire

Hook commun:

1. `src/lib/hooks/useFormField.ts`

Comportement:

1. labels visibles en permanence
2. erreurs inline apres blur/soumission
3. etat positif "Champ valide" quand applicable
4. liens `aria-describedby` via composants DS

## Accessibilite

1. focus visible sur tous les controles
2. textes et labels en francais
3. dark mode supporte via tokens semantiques
4. animations reduites automatiquement si `prefers-reduced-motion`

## Donnees et architecture

1. lecture consolidee dashboard: `src/lib/api/dashboard.ts`
2. metriques de domaine: `src/lib/domain/dashboard.ts`
3. logique metier et actions serveur inchangees (pas de modification schema/RLS)
