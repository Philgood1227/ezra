# Timeline And Focus

## Overview

La vue `Ma journee` enfant reprend une logique type Tiimo:

1. Ligne du temps verticale avec repere "Maintenant".
2. Cartes visuelles colorees par categorie.
3. Validation rapide des taches sans surcharge cognitive.

Objectif TDAH:

1. Clarifier "ce que je fais maintenant".
2. Rendre visible "ce qui arrive ensuite".
3. Fournir un retour immediat (animation + haptique + points).

## Components

### DayTimeline

Fichier: `src/components/timeline/day-timeline.tsx`

1. Compose `TimeAxis`, `NowCursor`, `TimelineTaskCard`, `NextUpBanner`.
2. Calcule `isPast`, `isCurrent`, `isFuture`.
3. Auto-scroll vers la zone courante au chargement.

### TimelineTaskCard

Fichier: `src/components/timeline/timeline-task-card.tsx`

1. Etats pris en charge: `a_faire`, `en_cours`, `termine`, `en_retard`, `ignore`.
2. Actions: `Commencer`, `Valider`, `Terminer directement`, `Mode focus`, `Voir la fiche`.
3. Animation de points via `PointsFlyUp` lors du passage a `termine`.

### NowCursor

Fichier: `src/components/timeline/now-cursor.tsx`

1. Dot + ligne horizontale + label `Maintenant`.
2. Position basee sur l'heure courante.
3. Pulse desactive si `prefers-reduced-motion`.

### NextUpBanner

Fichier: `src/components/timeline/next-up-banner.tsx`

1. Bandeau sticky en haut de la timeline.
2. Affiche `Maintenant` et `Ensuite`.
3. Transition douce quand la tache active change.

### DailyProgressBar

Fichier: `src/components/timeline/daily-progress-bar.tsx`

1. Resume compact points + progression taches.
2. Utilise `ProgressBar` du design system.

## Interactions

Flux de validation optimiste (`src/components/child/my-day/child-day-view-live.tsx`):

1. Mise a jour locale immediate de la tache.
2. Appel de `updateTaskStatusAction`.
3. En cas d'erreur: rollback + toast `Erreur lors de la mise a jour`.

Haptique (`src/lib/utils/haptic.ts`):

1. `haptic("tap")` pour `a_faire -> en_cours`.
2. `haptic("success")` pour passage a `termine`.
3. `haptic("error")` en cas d'echec serveur.

## Focus Mode

### FocusView

Fichier: `src/components/child/focus/focus-view.tsx`

1. Ecran prioritaire sans tab bar.
2. Contexte de tache + points possibles en haut.
3. Choix `Minuteur` ou `Pomodoro`.

### CircularTimer

Fichier: `src/components/timers/circular-timer.tsx`

1. Minuteur SVG circulaire (style time timer).
2. Arc qui se reduit selon le temps restant.
3. Texte central `MM:SS`, aria-label en francais.

### PomodoroView

Fichier: `src/components/timers/pomodoro-view.tsx`

1. Phases travail/pause avec indicateurs de cycle.
2. Controles: `Demarrer`, `Pause`, `Passer la pause`, `Terminer la mission`.
3. Callback de fin de mission avec minutes concentrees.

## Animations

1. Entree de page avec `PageTransition`.
2. Entree des cartes timeline avec `StaggerContainer` + `StaggerItem`.
3. `PointsFlyUp` pour `+N points`.
4. Transitions de phase focus via `AnimatePresence`.
5. Respect global de `prefers-reduced-motion`.

## Accessibility

1. Cibles tactiles >= 48px (souvent 56px).
2. Labels explicites en francais.
3. Etats visibles (en cours, termine, en retard).
4. Skeletons pendant chargement.
5. Compatibilite clavier et fermeture `Escape` pour les overlays.
