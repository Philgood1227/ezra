# Child Modules Redesign

## Overview

Cette refonte harmonise les 6 modules secondaires enfant avec le meme langage visuel premium que l'accueil et "Ma journee":

1. cartes glassmorphism
2. transitions douces avec Framer Motion
3. feedback immediat (haptique + toast)
4. skeletons de chargement
5. empty states explicites

Objectif produit:

1. reduire la charge cognitive
2. garder des interactions courtes et lisibles
3. conserver une tonalite chaleureuse en francais

## Visual foundation

Patterns communs a tous les modules:

1. `PageTransition` pour l'entree de page
2. `StaggerContainer` + `StaggerItem` pour listes et grilles
3. `Card` DS (`bg-bg-surface/80`, bordure subtile, ombre douce)
4. etats de chargement via `Skeleton`
5. etats sans donnees via `EmptyState`
6. micro-interactions via `ScaleOnTap`

## Checklists (`/child/checklists`)

Composants:

1. `src/components/child/checklists/checklist-card.tsx`
2. `src/components/child/checklists/checklist-item-row.tsx`
3. `src/components/child/checklists/child-checklists-view.tsx`

Interactions:

1. cartes extensibles/reductibles
2. checkbox tactile 56px avec animation de check
3. progression globale et par checklist
4. celebration "Tout est pret" + haptique `success`

## Decouvertes (`/child/knowledge`)

Composants:

1. `src/components/child/knowledge/subject-card.tsx`
2. `src/components/child/knowledge/knowledge-card-tile.tsx`
3. `src/components/child/knowledge/knowledge-card-detail.tsx`
4. `src/components/child/knowledge/child-knowledge-view.tsx`

Interactions:

1. grille de matieres colorees
2. favoris en ligne horizontale si presents
3. coeur favori avec toggle optimiste + haptique
4. detail de fiche structure en sections (`Rappel`, `Exemple`, `Astuce`)

## Succes (`/child/achievements`)

Composants:

1. `src/components/child/achievements/achievement-badge.tsx`
2. `src/components/child/achievements/achievement-unlock-celebration.tsx`
3. `src/components/child/achievements/child-achievements-view.tsx`

Interactions:

1. badges verrouilles/debloques differencies
2. modal de details au tap sur badge debloque
3. celebration de nouveau badge (overlay + confetti)

## Cinema (`/child/cinema`)

Composants:

1. `src/components/child/cinema/movie-option-card.tsx`
2. `src/components/child/cinema/child-cinema-view.tsx`

Interactions:

1. cartes film style poster avec gradients
2. vote optimiste ("Je choisis ce film")
3. etats explicites: planifiee, choisie, terminee

## Emotions (`/child/emotions`)

Composants:

1. `src/components/child/emotions/emotion-picker.tsx`
2. `src/components/child/emotions/emotion-check-in-card.tsx`
3. `src/components/child/emotions/week-emotion-strip.tsx`
4. `src/components/child/emotions/child-emotions-view.tsx`

Interactions:

1. selection emoji animee (matin/soir)
2. note optionnelle
3. sauvegarde optimiste + toast + haptique
4. historique semaine compact sur 7 jours

## Repas (`/child/meals`)

Composants:

1. `src/components/child/meals/meal-card.tsx`
2. `src/components/child/meals/favorite-meals-list.tsx`
3. `src/components/child/meals/child-meals-view.tsx`

Interactions:

1. page fonctionnelle (plus de redirection)
2. notation a 3 niveaux (`Bof`, `Bon`, `J'adore`)
3. section favoris pour repas notes 3
4. sauvegarde optimiste + toast + haptique

## Accessibility and UX rules

1. textes en francais, formulations courtes
2. cibles tactiles >= 48px (souvent 56px)
3. animations desactivees ou reduites via `prefers-reduced-motion`
4. dark mode natif via tokens semantiques
5. meme structure cognitive sur les 6 modules (titre, resume, contenu, etat vide)

## Data and architecture notes

1. aucune modification des schemas Supabase/RLS
2. reutilisation exclusive des loaders/actions existants (`src/lib/api/*`, `src/lib/actions/*`)
3. logique optimiste cote client avec revert en cas d'erreur
4. nettoyage des anciens composants enfant remplaces
